import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: PageProps) {
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

  const { id } = await params;

  try {
    const body = await req.json();
    const { amount, paymentMethod, referenceNo, notes } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ message: "Valid payment amount is required" }, { status: 400 });
    }

    const po = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    const targetTotalCost = po.finalCost ?? po.totalEstimatedCost;
    const newPaidAmount = po.paidAmount + paymentAmount;

    let paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID" = "UNPAID";
    if (newPaidAmount >= targetTotalCost && targetTotalCost > 0) {
      paymentStatus = "FULLY_PAID";
    } else if (newPaidAmount > 0) {
      paymentStatus = "PARTIALLY_PAID";
    }

    await db.$transaction(async (tx) => {
      // Create payment record
      await tx.supplierPayment.create({
        data: {
          supplierId: po.supplierId,
          poId: id,
          amount: paymentAmount,
          paymentMethod: paymentMethod || "CASH",
          referenceNo: referenceNo || null,
          notes: notes || null,
          paidById: session.user.id,
          paidByName: session.user.name || session.user.email || "Finance Staff",
        },
      });

      // Update PO paid amount and status
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus,
          paymentMethod: paymentMethod || po.paymentMethod,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Supplier payment recorded successfully!",
    });
  } catch (error: any) {
    console.error("[Supplier Payment API Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
