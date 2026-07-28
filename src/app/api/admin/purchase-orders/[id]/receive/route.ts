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
    hasPermission(session, "purchase_orders.receive") ||
    hasPermission(session, "catalog.manage_inventory");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      invoiceNo,
      deliveryNoteNo,
      paymentMethod, // CASH, BANK_TRANSFER, CHEQUE, CREDIT
      paidAmount: initialPaidAmount,
      referenceNo,
      notes,
      damagedNotes,
      receivedItems, // Array of { poItemId, receivedQty, damagedQty, finalUnitCost }
    } = body;

    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      return NextResponse.json(
        { message: "At least one received item detail is required" },
        { status: 400 }
      );
    }

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    if (!["APPROVED", "GOODS_RECEIVED", "REVIEWING"].includes(po.status)) {
      return NextResponse.json(
        { message: `Cannot receive goods for PO in ${po.status} status` },
        { status: 400 }
      );
    }

    const receiptNumber = `GRN-${po.poNumber.replace("POR-", "")}-${Date.now().toString().slice(-4)}`;

    let totalReceivedInReceipt = 0;
    let totalDamagedInReceipt = 0;
    let calculatedFinalPOCost = 0;

    await db.$transaction(async (tx) => {
      // 1. Create Receipt (GRN)
      const receipt = await tx.purchaseOrderReceipt.create({
        data: {
          poId: id,
          receiptNumber,
          invoiceNo: invoiceNo || null,
          deliveryNoteNo: deliveryNoteNo || null,
          receivedById: session.user.id,
          receivedByName: session.user.name || session.user.email || "Warehouse Staff",
          notes: notes || null,
          damagedNotes: damagedNotes || null,
        },
      });

      // 2. Process each item
      for (const recItem of receivedItems) {
        const existingPoItem = po.items.find((i) => i.id === recItem.poItemId);
        if (!existingPoItem) continue;

        const recQty = Math.max(0, Number(recItem.receivedQty) || 0);
        const damQty = Math.max(0, Number(recItem.damagedQty) || 0);
        const accQty = Math.max(0, recQty - damQty);
        const unitCost = Number(recItem.finalUnitCost) ?? existingPoItem.estimatedUnitCost;

        totalReceivedInReceipt += recQty;
        totalDamagedInReceipt += damQty;

        // Create Receipt Item
        await tx.purchaseOrderReceiptItem.create({
          data: {
            receiptId: receipt.id,
            poItemId: recItem.poItemId,
            receivedQty: recQty,
            damagedQty: damQty,
            acceptedQty: accQty,
            unitCost,
          },
        });

        // Update PO Item cumulative quantities & cost
        const newReceivedQty = existingPoItem.receivedQty + recQty;
        const newDamagedQty = existingPoItem.damagedQty + damQty;
        const newAcceptedQty = existingPoItem.acceptedQty + accQty;

        await tx.purchaseOrderItem.update({
          where: { id: recItem.poItemId },
          data: {
            receivedQty: newReceivedQty,
            damagedQty: newDamagedQty,
            acceptedQty: newAcceptedQty,
            finalUnitCost: unitCost,
          },
        });

        calculatedFinalPOCost += newAcceptedQty * unitCost;
      }

      // Update Receipt summary counts
      await tx.purchaseOrderReceipt.update({
        where: { id: receipt.id },
        data: {
          totalReceived: totalReceivedInReceipt,
          totalDamaged: totalDamagedInReceipt,
        },
      });

      // 3. Process Initial Payment if provided
      let currentPaidAmount = po.paidAmount;
      const paymentInput = Math.max(0, Number(initialPaidAmount) || 0);

      if (paymentInput > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: po.supplierId,
            poId: id,
            amount: paymentInput,
            paymentMethod: paymentMethod || "CASH",
            referenceNo: referenceNo || null,
            notes: `Initial payment upon goods receiving (GRN: ${receiptNumber})`,
            paidById: session.user.id,
            paidByName: session.user.name || session.user.email || "Finance Staff",
          },
        });

        currentPaidAmount += paymentInput;
      }

      // Determine Payment Status
      let paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID" = "UNPAID";
      if (currentPaidAmount >= calculatedFinalPOCost && calculatedFinalPOCost > 0) {
        paymentStatus = "FULLY_PAID";
      } else if (currentPaidAmount > 0) {
        paymentStatus = "PARTIALLY_PAID";
      }

      // 4. Update PO Status to REVIEWING (Ready for inventory intake review)
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "REVIEWING",
          paymentMethod: paymentMethod || po.paymentMethod,
          finalCost: calculatedFinalPOCost,
          paidAmount: currentPaidAmount,
          paymentStatus,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Goods receiving recorded successfully. Order moves to Inventory Review.",
    });
  } catch (error: any) {
    console.error("[Receive Goods API Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
