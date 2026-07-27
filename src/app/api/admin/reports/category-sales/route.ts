import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/admin/reports/category-sales
 *
 * Category/Sub-category Sales Report API with Date range filters.
 * Protect strictly with permission check.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, "reports.category_sales")) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let start = startDateParam ? new Date(startDateParam) : new Date();
    if (!startDateParam) {
      // Default to 30 days ago
      start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);

    let end = endDateParam ? new Date(endDateParam) : new Date();
    end.setHours(23, 59, 59, 999);

    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          paymentStatus: "PAID",
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        totalQty: number;
        totalRevenue: number;
        products: Map<
          string,
          {
            id: string;
            name: string;
            totalQty: number;
            totalRevenue: number;
          }
        >;
      }
    >();

    const UNCATEGORIZED_ID = "uncategorized";
    const UNCATEGORIZED_NAME = "Uncategorized";

    for (const item of orderItems) {
      const category = item.product?.category;
      const catId = category?.id || UNCATEGORIZED_ID;
      const catName = category?.name || UNCATEGORIZED_NAME;

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          id: catId,
          name: catName,
          totalQty: 0,
          totalRevenue: 0,
          products: new Map(),
        });
      }

      const catData = categoryMap.get(catId)!;
      catData.totalQty += item.quantity;
      catData.totalRevenue += item.subtotal;

      const prodId = item.productId || "unknown";
      const prodName = item.productName || "Unknown Product";

      if (!catData.products.has(prodId)) {
        catData.products.set(prodId, {
          id: prodId,
          name: prodName,
          totalQty: 0,
          totalRevenue: 0,
        });
      }

      const prodData = catData.products.get(prodId)!;
      prodData.totalQty += item.quantity;
      prodData.totalRevenue += item.subtotal;
    }

    const categoriesArray = Array.from(categoryMap.values()).map((cat) => ({
      id: cat.id,
      name: cat.name,
      totalQtySold: cat.totalQty,
      totalRevenue: Math.round(cat.totalRevenue * 100) / 100,
      products: Array.from(cat.products.values()).map((p) => ({
        id: p.id,
        name: p.name,
        totalQtySold: p.totalQty,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
      })).sort((a, b) => b.totalRevenue - a.totalRevenue),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      success: true,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      categories: categoriesArray,
    });
  } catch (error: any) {
    console.error("[Category Sales Report API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
