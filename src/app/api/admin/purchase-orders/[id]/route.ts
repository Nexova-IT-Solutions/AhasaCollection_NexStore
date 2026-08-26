import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
        receipts: {
          include: {
            items: true,
          },
          orderBy: { receivedAt: "desc" },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ purchaseOrder });
  } catch (error: any) {
    console.error("[PO Details API Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { action, rejectionReason } = body;

    const po = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    // Workflow actions: APPROVE, REJECT, CANCEL
    if (action === "APPROVE") {
      const canApprove =
        ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
        hasPermission(session, "purchase_orders.approve");

      if (!canApprove) {
        return NextResponse.json(
          { message: "Forbidden: Purchase Order Approval permission required" },
          { status: 403 }
        );
      }

      if (po.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { message: `Cannot approve PO in ${po.status} status` },
          { status: 400 }
        );
      }

      const updated = await db.purchaseOrder.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedByName: session.user.name || session.user.email || "Stock Admin",
          approvedAt: new Date(),
        },
        include: { supplier: true, items: true },
      });

      return NextResponse.json({ success: true, purchaseOrder: updated });
    }

    if (action === "REJECT") {
      const canApprove =
        ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
        hasPermission(session, "purchase_orders.approve");

      if (!canApprove) {
        return NextResponse.json(
          { message: "Forbidden: Purchase Order Approval permission required" },
          { status: 403 }
        );
      }

      if (po.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { message: `Cannot reject PO in ${po.status} status` },
          { status: 400 }
        );
      }

      const updated = await db.purchaseOrder.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "Rejected by Stock Admin",
        },
        include: { supplier: true, items: true },
      });

      return NextResponse.json({ success: true, purchaseOrder: updated });
    }

    if (action === "CANCEL") {
      if (["COMPLETED", "GOODS_RECEIVED", "REVIEWING"].includes(po.status)) {
        return NextResponse.json(
          { message: "Cannot cancel PO that has goods received or completed" },
          { status: 400 }
        );
      }

      const updated = await db.purchaseOrder.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
        include: { supplier: true, items: true },
      });

      return NextResponse.json({ success: true, purchaseOrder: updated });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[PO Workflow Update Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
