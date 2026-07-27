import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        purchasedGiftCards: true,
      },
    });

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    // Security: Only allow fetching if order is PAID or DELIVERED
    // Also allow CONFIRMED as it's often used for paid orders before shipping
    const allowedStatuses = ["PAID", "DELIVERED", "CONFIRMED", "SHIPPED", "PACKED", "READY_TO_SHIP"];
    const isPaid = order.paymentStatus === "PAID";
    
    // In some cases, paymentStatus might be PENDING for COD, but gift cards are digital
    // For Digital Gift Cards, they should probably only be released after payment
    if (!isPaid) {
      return NextResponse.json({ giftCards: [], message: "Payment pending. Gift cards will be available after payment confirmation." });
    }

    return NextResponse.json({ giftCards: order.purchasedGiftCards });
  } catch (error) {
    console.error("[ORDER_GIFT_CARDS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
