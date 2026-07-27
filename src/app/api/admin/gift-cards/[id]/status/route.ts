import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PATCH /api/admin/gift-cards/[id]/status
 *
 * Admin-controlled status transitions for gift cards.
 *
 * Allowed transitions:
 *   AVAILABLE → DISABLED  (admin manually disables a card)
 *   DISABLED  → AVAILABLE (admin manually re-enables a card)
 *
 * Forbidden transitions (enforced server-side):
 *   USED → AVAILABLE  (mathematically depleted; requires a balance adjustment first)
 *   *    → USED       (only the payment transaction engine may set USED)
 *
 * Body params:
 *   status  — Target status: "AVAILABLE" | "DISABLED"
 *   balance — Optional balance override (number, ≥ 0)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, balance } = body as { status?: string; balance?: number };

    // ── Fetch current card ────────────────────────────────────
    const current = await db.giftCard.findUnique({
      where: { id },
      select: { id: true, status: true, balance: true, code: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // ── Status transition validation ──────────────────────────
    if (status !== undefined) {
      const validTargets = ["AVAILABLE", "DISABLED"];

      // Reject any attempt to set USED manually — only the payment engine does this
      if (status === "USED") {
        return NextResponse.json(
          {
            error: "FORBIDDEN_TRANSITION",
            message:
              "A card cannot be manually marked as USED. This status is set automatically when the card balance reaches zero during a payment transaction.",
          },
          { status: 422 }
        );
      }

      if (!validTargets.includes(status)) {
        return NextResponse.json(
          { error: "INVALID_STATUS", message: `Status must be one of: ${validTargets.join(", ")}` },
          { status: 400 }
        );
      }

      // Block USED → AVAILABLE without a balance adjustment
      if (current.status === "USED" && status === "AVAILABLE") {
        // Allow only if admin is also providing a positive balance top-up
        const newBalance = typeof balance === "number" ? balance : undefined;
        if (newBalance === undefined || newBalance <= 0) {
          return NextResponse.json(
            {
              error: "BALANCE_REQUIRED",
              message:
                "A card with status USED cannot be re-activated without a positive balance adjustment. Provide a balance > 0 to restore the card to AVAILABLE.",
            },
            { status: 422 }
          );
        }
        // Allow the transition when balance is being restored
        updateData.balance = newBalance;
      }

      updateData.status = status;

      // Sync isActive flag: DISABLED → false, AVAILABLE → true
      updateData.isActive = status === "AVAILABLE";
    }

    // ── Optional standalone balance update ────────────────────
    if (balance !== undefined && updateData.balance === undefined) {
      const numBalance = Number(balance);
      if (isNaN(numBalance) || numBalance < 0) {
        return NextResponse.json(
          { error: "INVALID_BALANCE", message: "Balance must be a non-negative number." },
          { status: 400 }
        );
      }
      updateData.balance = numBalance;

      // Auto-transition: if admin restores balance on a USED card without explicit status, promote to AVAILABLE
      if (current.status === "USED" && numBalance > 0 && !status) {
        updateData.status = "AVAILABLE";
        updateData.isActive = true;
      }

      // Auto-transition: if balance drops to 0, mark as USED
      if (numBalance === 0 && current.status === "AVAILABLE") {
        updateData.status = "USED";
        updateData.isActive = false;
      }
    }

    const card = await db.giftCard.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    console.error("[ADMIN_GIFT_CARD_STATUS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
