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

/**
 * POST /api/admin/pos/gift-cards/check-issuance
 *
 * Validates that a physical gift card code/barcode is eligible for
 * POS issuance (activation). This is the OPPOSITE of /verify:
 *   - /verify  → checks the card HAS balance (for payment/redemption)
 *   - /check-issuance → checks the card has NO balance yet and is INACTIVE (for selling/activation)
 *
 * A card is eligible for issuance if:
 *   1. It exists in the database (pre-registered / pre-printed)
 *   2. It is isPhysical = true
 *   3. It is NOT yet active (isActive = false OR status = AVAILABLE with balance = 0)
 *   4. It has not already been sold (purchasedInOrderId = null)
 *
 * GiftCard cards sold at POS go through this flow:
 *   Operator scans blank card → check-issuance validates it → checkout activates it
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { eligible: false, reason: "UNAUTHORIZED", message: "Unauthorized: POS access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawCode = body?.code;
    const isPhysicalRequest = body?.isPhysical !== undefined ? Boolean(body.isPhysical) : true;

    if (!rawCode || typeof rawCode !== "string" || rawCode.trim() === "") {
      return NextResponse.json(
        { eligible: false, reason: "MISSING_CODE", message: "Gift card code or barcode is required" },
        { status: 400 }
      );
    }

    const lookupCode = rawCode.toUpperCase().trim();

    // ─── Find card by code OR barcode ───────────────────────────────────────
    let giftCard = await db.giftCard.findFirst({
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
        purchasedInOrderId: true,
      },
    });

    // ─── Card must exist or Auto-Register ───────────────────────────────────
    if (!giftCard) {
      // Auto-register the new card in DISABLED state by default
      giftCard = await db.giftCard.create({
        data: {
          code: lookupCode,
          barcode: lookupCode,
          balance: 0,
          initialValue: 0,
          isActive: false,
          isPhysical: isPhysicalRequest,
          status: "DISABLED",
          expiresAt: new Date("2030-12-31T23:59:59Z"),
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
          purchasedInOrderId: true,
        },
      });
    }

    // ─── If requested physical, must match ───────────────────────────────────
    if (isPhysicalRequest && !giftCard.isPhysical) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "NOT_PHYSICAL",
          message: "This is registered as a digital gift card and cannot be issued as physical.",
        },
        { status: 400 }
      );
    }

    // ─── Must not already be sold/active ────────────────────────────────────
    // A card with purchasedInOrderId has already been sold in a previous order.
    if (giftCard.purchasedInOrderId) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "ALREADY_SOLD",
          message: "This gift card has already been sold. Check the card code and try again.",
        },
        { status: 400 }
      );
    }

    // ─── Must not already have a positive balance ────────────────────────────
    // If it has balance > 0 it was already activated (e.g. from a previous POS session).
    if (giftCard.balance > 0 || giftCard.isActive) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "ALREADY_ACTIVE",
          message: "This gift card already has a balance and appears to be active. It cannot be re-issued.",
        },
        { status: 400 }
      );
    }

    // ─── Must not be DISABLED (unless it's a new card waiting for activation) ───────────────────
    if (giftCard.status === "DISABLED" && (giftCard.isActive || giftCard.balance > 0 || giftCard.purchasedInOrderId)) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "DISABLED",
          message: "This gift card has been disabled and cannot be issued.",
        },
        { status: 400 }
      );
    }

    // ─── All checks passed — card is eligible for issuance ──────────────────
    return NextResponse.json({
      eligible: true,
      cardId: giftCard.id,
      code: giftCard.code,
      barcode: giftCard.barcode,
      initialValue: giftCard.initialValue,
    });
  } catch (error) {
    console.error("[POS Gift Card Check-Issuance] Error:", error);
    return NextResponse.json(
      { eligible: false, reason: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
