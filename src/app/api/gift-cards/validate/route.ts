import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ valid: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ valid: false, message: "Gift card code is required" }, { status: 400 });
    }

    const giftCard = await db.giftCard.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!giftCard) {
      return NextResponse.json({ valid: false, message: "Invalid gift card code" }, { status: 404 });
    }

    if (!giftCard.isActive) {
      return NextResponse.json({ valid: false, message: "Gift card is no longer active" }, { status: 400 });
    }

    if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
      return NextResponse.json({ valid: false, message: "Gift card has expired" }, { status: 400 });
    }

    if (giftCard.balance <= 0) {
      return NextResponse.json({ valid: false, message: "Gift card balance is depleted" }, { status: 400 });
    }

    // Check race condition hold
    if (giftCard.heldUntil && giftCard.heldUntil > new Date() && giftCard.heldByOrderId) {
      return NextResponse.json({ valid: false, message: "Code is temporarily unavailable" }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      cardId: giftCard.id,
      code: giftCard.code,
      balance: giftCard.balance,
      message: "Gift card applied successfully",
    }, { status: 200 });

  } catch (error) {
    console.error("[validate-gift-card] Error:", error);
    return NextResponse.json({ valid: false, message: "Internal server error" }, { status: 500 });
  }
}
