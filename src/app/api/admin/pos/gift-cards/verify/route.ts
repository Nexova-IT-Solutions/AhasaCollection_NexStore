import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = [
  "SUPER_ADMIN", "DEV_ADMIN",
  "ADMIN",
  "POS_ADMIN",
  "STOREFRONT_ADMIN",
  "PRODUCT_MANAGER",
  "CUSTOM_ROLE",
];

// ─── Human-readable reason codes for the frontend ────────────────────────────
type FailReason =
  | "NOT_FOUND"
  | "NOT_PHYSICAL"
  | "INACTIVE"
  | "EXPIRED"
  | "ZERO_BALANCE"
  | "HELD"
  | "ALREADY_USED";

function failResponse(reason: FailReason, message: string, status: number) {
  return NextResponse.json({ valid: false, reason, message }, { status });
}

/**
 * POST /api/admin/pos/gift-cards/verify
 *
 * Real-time physical gift card validation for the POS checkout modal.
 * Accepts either the alphanumeric code OR the barcode value.
 *
 * Returns the card balance and usability state. Does NOT deduct the balance —
 * deduction happens atomically inside /api/admin/pos/checkout.
 *
 * Reason codes allow the frontend to show precise, operator-friendly messages.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { valid: false, reason: "UNAUTHORIZED", message: "Unauthorized: POS access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== "string" || rawCode.trim() === "") {
      return NextResponse.json(
        { valid: false, reason: "MISSING_CODE", message: "Gift card code or barcode is required" },
        { status: 400 }
      );
    }

    const lookupCode = rawCode.toUpperCase().trim();

    // ─── Lookup by code OR barcode ───────────────────────────────────────────
    const giftCard = await db.giftCard.findFirst({
      where: {
        OR: [{ code: lookupCode }, { barcode: lookupCode }],
      },
      select: {
        id: true,
        code: true,
        barcode: true,
        balance: true,
        initialValue: true,
        isActive: true,
        isPhysical: true,
        status: true,
        expiresAt: true,
        heldByOrderId: true,
        heldUntil: true,
      },
    });

    // ─── Not found ───────────────────────────────────────────────────────────
    if (!giftCard) {
      return failResponse("NOT_FOUND", `No gift card found for code: ${lookupCode}`, 404);
    }

    // ─── Physical-only enforcement ───────────────────────────────────────────
    // Digital e-gift cards are not redeemable via the physical POS terminal.
    if (!giftCard.isPhysical) {
      return failResponse(
        "NOT_PHYSICAL",
        "This is a digital gift card and cannot be redeemed at the POS terminal.",
        400
      );
    }

    // ─── Active / Status check ───────────────────────────────────────────────
    if (!giftCard.isActive || giftCard.status === "DISABLED") {
      return failResponse("INACTIVE", "This gift card has been deactivated.", 400);
    }

    if (giftCard.status === "USED") {
      return failResponse("ALREADY_USED", "This gift card has already been fully redeemed.", 400);
    }

    // ─── Expiry check ────────────────────────────────────────────────────────
    if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
      return failResponse(
        "EXPIRED",
        `This gift card expired on ${giftCard.expiresAt.toLocaleDateString("en-LK")}.`,
        400
      );
    }

    // ─── Zero balance check ──────────────────────────────────────────────────
    if (giftCard.balance <= 0) {
      return failResponse("ZERO_BALANCE", "This gift card has no remaining balance.", 400);
    }

    // ─── Optimistic hold check ───────────────────────────────────────────────
    // A card with an active hold means another POS session is currently in checkout with it.
    if (
      giftCard.heldUntil &&
      new Date() < giftCard.heldUntil &&
      giftCard.heldByOrderId
    ) {
      return failResponse(
        "HELD",
        "This card is temporarily reserved by another transaction. Please wait a moment and try again.",
        409
      );
    }

    // ─── All checks passed ───────────────────────────────────────────────────
    return NextResponse.json({
      valid: true,
      cardId: giftCard.id,
      code: giftCard.code,
      barcode: giftCard.barcode,
      balance: giftCard.balance,
      initialValue: giftCard.initialValue,
      isPhysical: giftCard.isPhysical,
      expiresAt: giftCard.expiresAt?.toISOString() ?? null,
      status: giftCard.status,
    });
  } catch (error) {
    console.error("[POS Gift Card Verify] Error:", error);
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
