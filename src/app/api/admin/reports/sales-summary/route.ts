import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getFeatureToggles } from "@/lib/queries/feature-toggles";

/**
 * GET /api/admin/reports/sales-summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns aggregate sales metrics for the given date range:
 *  - totalSales, totalCostOfSales, totalDiscounts, netProfit, orderCount
 *  - dailySales[] for charting
 *  - salesByPaymentMethod[] breakdown
 *  - salesBySource (WEB vs POS)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!hasPermission(session, "reports.sales_summary")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing reports.sales_summary permission" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Default to current month if no dates provided
    const now = new Date();
    const startDate = startDateStr
      ? new Date(`${startDateStr}T00:00:00.000Z`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr
      ? new Date(`${endDateStr}T23:59:59.999Z`)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // ─── Fetch PAID orders with items and product cost ─────────
    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: "PAID",
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        giftCardDeduction: true,
        paymentMethod: true,
        orderSource: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            salePrice: true,
            subtotal: true,
            discountValue: true,
            product: {
              select: {
                costPrice: true,
              },
            },
          },
        },
      },
    });

    // ─── Aggregation calculations ─────────────────────────────
    let totalSales = 0;
    let totalCostOfSales = 0;
    let totalDiscounts = 0;
    let totalGiftCardDeductions = 0;
    const orderCount = orders.length;

    // Daily sales map: "YYYY-MM-DD" -> { revenue, orders, cost }
    const dailyMap = new Map<string, { revenue: number; orders: number; cost: number; discounts: number }>();

    // Payment method breakdown
    const paymentMethodMap = new Map<string, { total: number; count: number }>();

    // Source breakdown
    let webSales = 0;
    let webOrders = 0;
    let posSales = 0;
    let posOrders = 0;

    for (const order of orders) {
      totalSales += order.total;
      totalGiftCardDeductions += order.giftCardDeduction || 0;

      // Payment method breakdown
      const pm = order.paymentMethod || "UNKNOWN";
      const existing = paymentMethodMap.get(pm) || { total: 0, count: 0 };
      paymentMethodMap.set(pm, {
        total: existing.total + order.total,
        count: existing.count + 1,
      });

      // Source breakdown
      if (order.orderSource === "POS") {
        posSales += order.total;
        posOrders += 1;
      } else {
        webSales += order.total;
        webOrders += 1;
      }

      // Daily aggregation
      const dayKey = order.createdAt.toISOString().split("T")[0];
      const dayData = dailyMap.get(dayKey) || { revenue: 0, orders: 0, cost: 0, discounts: 0 };

      dayData.revenue += order.total;
      dayData.orders += 1;

      // Item-level calculations
      for (const item of order.items) {
        const costPrice = item.product?.costPrice ?? 0;
        const itemCost = costPrice * item.quantity;
        totalCostOfSales += itemCost;
        dayData.cost += itemCost;

        // Item-level discount: difference between unitPrice and salePrice (if discounted)
        if (item.discountValue && item.discountValue > 0) {
          totalDiscounts += item.discountValue * item.quantity;
          dayData.discounts += item.discountValue * item.quantity;
        } else if (item.salePrice && item.salePrice < item.unitPrice) {
          const itemDiscount = (item.unitPrice - item.salePrice) * item.quantity;
          totalDiscounts += itemDiscount;
          dayData.discounts += itemDiscount;
        }
      }

      dailyMap.set(dayKey, dayData);
    }

    // Round all monetary values
    totalSales = Math.round(totalSales * 100) / 100;
    totalCostOfSales = Math.round(totalCostOfSales * 100) / 100;
    totalDiscounts = Math.round(totalDiscounts * 100) / 100;
    const netProfit = Math.round((totalSales - totalCostOfSales) * 100) / 100;
    const grossMarginPercent =
      totalSales > 0 ? Math.round((netProfit / totalSales) * 10000) / 100 : 0;
    const avgOrderValue =
      orderCount > 0 ? Math.round((totalSales / orderCount) * 100) / 100 : 0;

    // Sort daily sales by date
    const dailySales = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
        cost: Math.round(data.cost * 100) / 100,
        discounts: Math.round(data.discounts * 100) / 100,
        profit: Math.round((data.revenue - data.cost) * 100) / 100,
      }));

    // Payment method breakdown
    const salesByPaymentMethod = Array.from(paymentMethodMap.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([method, data]) => ({
        method,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
      }));

    const toggles = await getFeatureToggles();
    const storefrontEnabled = toggles?.storefront_website_enabled !== false;

    return NextResponse.json({
      success: true,
      storefrontEnabled,
      summary: {
        totalSales,
        totalCostOfSales,
        totalDiscounts,
        totalGiftCardDeductions: Math.round(totalGiftCardDeductions * 100) / 100,
        netProfit,
        grossMarginPercent,
        orderCount,
        avgOrderValue,
      },
      dailySales,
      salesByPaymentMethod,
      salesBySource: {
        web: { total: Math.round(webSales * 100) / 100, orders: webOrders },
        pos: { total: Math.round(posSales * 100) / 100, orders: posOrders },
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Reports Sales Summary] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
