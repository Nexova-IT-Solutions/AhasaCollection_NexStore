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

    await db.giftCard.updateMany({
      where: { 
        code: code.toUpperCase().trim(),
        heldByOrderId: orderId // Only release if held by this precise order logic
      },
      data: {
        heldUntil: null,
        heldByOrderId: null
      }
    });

    return NextResponse.json({ success: true, message: "Balance released" }, { status: 200 });

  } catch (error) {
    console.error("[release-gift-card] Error:", error);
    return NextResponse.json({ message: "Failed to release gift card" }, { status: 500 });
  }
}
