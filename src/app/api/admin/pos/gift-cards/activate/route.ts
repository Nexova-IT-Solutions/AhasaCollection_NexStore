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
 * POST /api/admin/pos/gift-cards/activate
 *
 * Standalone administrative action to activate a physical gift card
 * with a specified initial value directly from the POS interface.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: POS access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawCode = body?.code;
    const value = Number(body?.value ?? 1000);
    const isPhysicalRequest = body?.isPhysical !== undefined ? Boolean(body.isPhysical) : true;

    if (!rawCode || typeof rawCode !== "string" || rawCode.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Gift card code or barcode is required" },
        { status: 400 }
      );
    }

    if (isNaN(value) || value <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid positive activation value is required" },
        { status: 400 }
      );
    }

    const lookupCode = rawCode.toUpperCase().trim();

    // ─── Find card by code OR barcode ───────────────────────────────────────
    let giftCard = await db.giftCard.findFirst({
      where: {
        OR: [{ code: lookupCode }, { barcode: lookupCode }],
      },
    });

    if (!giftCard) {
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
      });
    }

    if (!giftCard.isPhysical) {
      return NextResponse.json(
        {
          success: false,
          message: "This is a digital gift card and cannot be manually activated via this terminal tool.",
        },
        { status: 400 }
      );
    }

    if (giftCard.isActive || giftCard.balance > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This gift card is already active and cannot be activated again.",
        },
        { status: 400 }
      );
    }

    if (giftCard.status === "DISABLED" && (giftCard.isActive || giftCard.balance > 0 || giftCard.purchasedInOrderId)) {
      return NextResponse.json(
        { success: false, message: "This gift card is disabled and cannot be activated." },
        { status: 400 }
      );
    }

    // Activate the gift card
    const updatedCard = await db.giftCard.update({
      where: { id: giftCard.id },
      data: {
        balance: value,
        initialValue: value,
        isActive: true,
        status: "AVAILABLE",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Gift card ${updatedCard.code} has been successfully activated with Rs. ${value.toLocaleString(
        "en-LK",
        { minimumFractionDigits: 2 }
      )}.`,
      giftCard: {
        id: updatedCard.id,
        code: updatedCard.code,
        balance: updatedCard.balance,
        isActive: updatedCard.isActive,
      },
    });
  } catch (error) {
    console.error("[POS Gift Card Manual Activation] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
