import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { code, orderId } = await req.json();

    if (!code || !orderId) {
      return NextResponse.json({ message: "Code and orderId are required" }, { status: 400 });
    }

    // Prisma updateMany for atomic check-and-set
    const result = await db.giftCard.updateMany({
      where: { 
        code: code.toUpperCase().trim(),
        balance: { gt: 0 },
        isActive: true,
        OR: [
          { heldUntil: null },
          { heldUntil: { lt: new Date() } } // Allows overriding if expired
        ]
      },
      data: {
        heldUntil: new Date(Date.now() + 15 * 60000), // 15 mins hold
        heldByOrderId: orderId
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Gift card cannot be held or is already locked" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Balance held for checkout" }, { status: 200 });

  } catch (error) {
    console.error("[hold-gift-card] Error:", error);
    return NextResponse.json({ message: "Failed to hold gift card" }, { status: 500 });
  }
}
