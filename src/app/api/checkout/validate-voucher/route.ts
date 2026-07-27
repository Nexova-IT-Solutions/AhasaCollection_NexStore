import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/checkout/validate-voucher
 *
 * Validates a gift card / paper voucher code for both POS and Web checkout.
 *
 * Body params:
 *   code      — The gift card code or barcode (required)
 *   channel   — "WEB" | "POS" (required for audit; POS skips auth)
 *   orderTotal — The current order total (optional; used to compute max deduction)
 *
 * Returns:
 *   { valid, cardId, code, balance, maxDeduction, expiresAt, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, channel, orderTotal } = body as {
      code?: string;
      channel?: "WEB" | "POS";
      orderTotal?: number;
    };

    // ── Validation ──────────────────────────────────────────────
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: "Gift card code is required." },
        { status: 400 }
      );
    }

    if (!channel || !["WEB", "POS"].includes(channel)) {
      return NextResponse.json(
        { valid: false, message: "A valid channel (WEB or POS) is required." },
        { status: 400 }
      );
    }

    // Web checkout requires authenticated session; POS operators run under their own session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { valid: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    // ── DB Lookup (supports barcode OR code field) ────────────
    const giftCard = await db.giftCard.findFirst({
      where: {
        OR: [{ code: normalizedCode }, { barcode: normalizedCode }],
      },
      select: {
        id: true,
        code: true,
        barcode: true,
        balance: true,
        initialValue: true,
        isActive: true,
        expiresAt: true,
        status: true,
        heldUntil: true,
        heldByOrderId: true,
      },
    });

    // ── Not found ─────────────────────────────────────────────
    if (!giftCard) {
      return NextResponse.json(
        { valid: false, message: "Gift card not found. Please check the code and try again." },
        { status: 404 }
      );
    }

    // ── Inactive ──────────────────────────────────────────────
    if (!giftCard.isActive) {
      return NextResponse.json(
        { valid: false, message: "This gift card has been deactivated." },
        { status: 400 }
      );
    }

    // ── Expired ───────────────────────────────────────────────
    if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          message: `This gift card expired on ${giftCard.expiresAt.toLocaleDateString("en-LK")}.`,
        },
        { status: 400 }
      );
    }

    // ── Depleted ──────────────────────────────────────────────
    if (giftCard.balance <= 0) {
      return NextResponse.json(
        { valid: false, message: "This gift card has no remaining balance." },
        { status: 400 }
      );
    }

    // ── Fully used ────────────────────────────────────────────
    if (giftCard.status === "USED") {
      return NextResponse.json(
        { valid: false, message: "This gift card has already been fully redeemed." },
        { status: 400 }
      );
    }

    // ── Disabled by admin ─────────────────────────────────────
    if (giftCard.status === "DISABLED") {
      return NextResponse.json(
        { valid: false, message: "This gift card has been deactivated. Please contact support." },
        { status: 400 }
      );
    }

    // ── Not AVAILABLE (catch-all safety) ─────────────────────
    if (giftCard.status !== "AVAILABLE") {
      return NextResponse.json(
        { valid: false, message: "This gift card is not available for redemption." },
        { status: 400 }
      );
    }

    // ── Temporary race-condition hold (web only) ──────────────
    if (
      channel === "WEB" &&
      giftCard.heldUntil &&
      giftCard.heldUntil > new Date() &&
      giftCard.heldByOrderId
    ) {
      return NextResponse.json(
        {
          valid: false,
          message:
            "This gift card is temporarily reserved for another order. Please try again shortly.",
        },
        { status: 409 }
      );
    }

    // ── Compute deduction ─────────────────────────────────────
    const safeTotal = typeof orderTotal === "number" && orderTotal > 0 ? orderTotal : Infinity;
    const maxDeduction = Math.min(giftCard.balance, safeTotal);

    return NextResponse.json(
      {
        valid: true,
        cardId: giftCard.id,
        code: giftCard.code,
        balance: giftCard.balance,
        maxDeduction,
        expiresAt: giftCard.expiresAt?.toISOString() ?? null,
        message: `Gift card applied — Rs. ${maxDeduction.toLocaleString("en-LK", {
          minimumFractionDigits: 2,
        })} will be deducted.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[validate-voucher] Error:", error);
    return NextResponse.json(
      { valid: false, message: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}
