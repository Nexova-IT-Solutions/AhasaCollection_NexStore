import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    // Using 'pos.manage_returns' as the permission for handling returns
    if (!hasPermission(session, "pos.manage_returns")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const orderId = id;
    const body = await req.json();
    const { orderItemId, quantity, reason, restock } = body;

    if (!orderItemId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const orderItem = order.items.find((item) => item.id === orderItemId);
    if (!orderItem) {
      return NextResponse.json({ success: false, message: "Order item not found" }, { status: 404 });
    }

    const availableToReturn = orderItem.quantity - (orderItem.returnedQuantity || 0);
    if (quantity > availableToReturn) {
      return NextResponse.json({ success: false, message: "Return quantity exceeds available quantity" }, { status: 400 });
    }

    // Calculate refund amount based on salePrice or unitPrice
    const itemPrice = orderItem.salePrice !== null ? orderItem.salePrice : orderItem.unitPrice;
    
    // Check if there was an order-level discount applied to this item? The existing logic uses `item.subtotal`.
    // Let's use proportional subtotal to be precise.
    const proportion = quantity / orderItem.quantity;
    const refundAmount = proportion * orderItem.subtotal;

    // Use a Prisma transaction to ensure all operations succeed or fail together
    const result = await db.$transaction(async (tx) => {
      // 1. Create the return record
      const returnRecord = await tx.orderItemReturn.create({
        data: {
          orderItemId,
          orderId,
          quantity,
          refundAmount,
          reason,
          restocked: restock,
        },
      });

      // 2. Update OrderItem returnedQuantity
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { returnedQuantity: { increment: quantity } },
      });

      // 3. Update Order refundedAmount
      await tx.order.update({
        where: { id: orderId },
        data: { refundedAmount: { increment: refundAmount } },
      });

      // 4. Update Product stock if restock is true and it's linked to a product
      if (restock && orderItem.productId && orderItem.productId !== "digital-gift-card") {
        await tx.product.updateMany({
          where: { id: orderItem.productId },
          data: { stock: { increment: quantity } },
        });
      }

      // 5. Add an Order Status History note for the audit log
      await tx.orderStatusHistory.create({
        data: {
          orderId: orderId,
          status: order.orderStatus,
          note: `Returned ${quantity}x ${orderItem.productName}. Reason: ${reason || "None"}. ${restock ? "Inventory restocked." : "Inventory not restocked."}`,
          changedByUserId: session?.user?.id,
          changedByName: session?.user?.name,
        }
      });

      return returnRecord;
    });

    return NextResponse.json({ success: true, returnRecord: result });
  } catch (error) {
    console.error("Error processing return:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
