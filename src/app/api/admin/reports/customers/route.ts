import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN"];

/**
 * GET /api/admin/reports/customers
 *
 * Returns list of customer insights:
 *  - totalPurchaseValue (lifetime value)
 *  - orderCount
 *  - lastPurchaseDate
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Query users with USER role, including paid orders
    const users = await db.user.findMany({
      where: {
        role: "USER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        orders: {
          where: {
            paymentStatus: "PAID",
          },
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
    });

    const customerInsights = users.map((u) => {
      const orderCount = u.orders.length;
      const totalPurchaseValue = Math.round(
        u.orders.reduce((sum, o) => sum + o.total, 0) * 100
      ) / 100;

      const lastPurchaseDate =
        orderCount > 0
          ? u.orders.reduce((latest, o) =>
              o.createdAt > latest ? o.createdAt : latest,
              u.orders[0].createdAt
            ).toISOString()
          : null;

      return {
        id: u.id,
        name: u.name || "Unnamed Customer",
        email: u.email || "No email provided",
        phone: u.phoneNumber || "No phone number",
        joinedDate: u.createdAt.toISOString(),
        orderCount,
        totalPurchaseValue,
        lastPurchaseDate,
      };
    });

    // Sort by LTV descending
    customerInsights.sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue);

    return NextResponse.json({
      success: true,
      totalCustomers: customerInsights.length,
      customers: customerInsights,
    });
  } catch (error: any) {
    console.error("[Reports Customer Insights] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
