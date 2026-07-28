import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "purchase_orders.payment") ||
    hasPermission(session, "catalog.stock_admin");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const suppliers = await db.supplier.findMany({
      where: { isActive: true },
      include: {
        purchaseOrders: {
          where: {
            status: { in: ["APPROVED", "GOODS_RECEIVED", "REVIEWING", "COMPLETED"] },
          },
          select: {
            id: true,
            poNumber: true,
            totalEstimatedCost: true,
            finalCost: true,
            paidAmount: true,
            paymentStatus: true,
            status: true,
            createdAt: true,
          },
        },
        payments: {
          take: 10,
          orderBy: { paidAt: "desc" },
        },
      },
    });

    const supplierSummaries = suppliers.map((sup) => {
      let totalPurchases = 0;
      let totalPaid = 0;

      sup.purchaseOrders.forEach((po) => {
        const cost = po.finalCost ?? po.totalEstimatedCost;
        totalPurchases += cost;
        totalPaid += po.paidAmount;
      });

      const outstandingBalance = Math.max(0, totalPurchases - totalPaid);

      return {
        id: sup.id,
        name: sup.name,
        contactName: sup.contactName,
        email: sup.email,
        phoneNumber: sup.phoneNumber,
        totalPurchases,
        totalPaid,
        outstandingBalance,
        activeOrdersCount: sup.purchaseOrders.filter((p) => p.paymentStatus !== "FULLY_PAID").length,
        recentPayments: sup.payments,
      };
    });

    return NextResponse.json({ suppliers: supplierSummaries });
  } catch (error: any) {
    console.error("[Supplier Balances Summary Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
