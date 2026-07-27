import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN"];

/**
 * POST /api/admin/pos/gift-cards/bulk-register
 *
 * Accepts an array of scanned barcodes and creates active physical gift cards
 * in the database. Uses a Prisma transaction to ensure atomicity.
 *
 * Body:
 * {
 *   barcodes: string[]        — array of unique barcode strings
 *   initialValue: number      — face value for all cards (e.g. 5000)
 *   expiresAt?: string        — optional ISO date for expiry
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { barcodes, initialValue, expiresAt } = body;

    // ─── Validation ───────────────────────────────────────────
    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one barcode is required" },
        { status: 400 }
      );
    }

    if (barcodes.length > 200) {
      return NextResponse.json(
        { success: false, message: "Maximum 200 barcodes per batch" },
        { status: 400 }
      );
    }

    if (typeof initialValue !== "number" || initialValue <= 0) {
      return NextResponse.json(
        { success: false, message: "Initial value must be a positive number" },
        { status: 400 }
      );
    }

    // Sanitize and deduplicate barcodes
    const cleanBarcodes: string[] = [];
    const seen = new Set<string>();
    const duplicatesInInput: string[] = [];

    for (const raw of barcodes) {
      const barcode = String(raw).trim();
      if (!barcode || barcode.length < 3) continue;

      if (seen.has(barcode)) {
        duplicatesInInput.push(barcode);
        continue;
      }
      seen.add(barcode);
      cleanBarcodes.push(barcode);
    }

    if (cleanBarcodes.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid barcodes provided after sanitization" },
        { status: 400 }
      );
    }

    // Check for already-existing barcodes in the database
    const existingCards = await db.giftCard.findMany({
      where: { barcode: { in: cleanBarcodes } },
      select: { barcode: true },
    });

    const existingBarcodesSet = new Set(
      existingCards.map((c) => c.barcode).filter(Boolean) as string[]
    );

    const newBarcodes = cleanBarcodes.filter((b) => !existingBarcodesSet.has(b));
    const skippedBarcodes = cleanBarcodes.filter((b) => existingBarcodesSet.has(b));

    if (newBarcodes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "All barcodes already exist in the system",
          skipped: skippedBarcodes,
        },
        { status: 409 }
      );
    }

    // Parse optional expiry date
    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date format" },
          { status: 400 }
        );
      }
      if (parsedExpiresAt <= new Date()) {
        return NextResponse.json(
          { success: false, message: "Expiry date must be in the future" },
          { status: 400 }
        );
      }
    }

    // ─── Bulk Create in Transaction ──────────────────────────
    const createdCards = await db.$transaction(async (tx) => {
      const cards: any[] = [];

      for (const barcode of newBarcodes) {
        // Generate a unique human-friendly code: GC-XXXXXXXX
        const code = `GC-${nanoid(10).toUpperCase()}`;

        const card = await tx.giftCard.create({
          data: {
            code: code,
            barcode: barcode,
            initialValue: initialValue,
            balance: initialValue,
            currency: "LKR",
            isActive: true,
            isPhysical: true,
            type: "PRINTED",
            status: "AVAILABLE",
            expiresAt: parsedExpiresAt,
            purchasedByUserId: session.user.id,
          },
          select: {
            id: true,
            code: true,
            barcode: true,
            initialValue: true,
            balance: true,
            status: true,
            isPhysical: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        cards.push(card);
      }

      return cards;
    }, {
      timeout: 30000, // Allow generous timeout for bulk operations
    });

    return NextResponse.json({
      success: true,
      message: `${createdCards.length} physical gift card(s) registered successfully`,
      created: createdCards,
      createdCount: createdCards.length,
      skipped: skippedBarcodes,
      skippedCount: skippedBarcodes.length,
      duplicatesInInput: duplicatesInInput,
    });
  } catch (error: any) {
    console.error("[POS Gift Card Bulk Register] Error:", error);

    // Handle unique constraint violations
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "One or more barcodes or codes already exist. Please try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
