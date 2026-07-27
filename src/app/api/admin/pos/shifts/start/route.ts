import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

/**
 * POST /api/admin/pos/shifts/start
 *
 * Opens a new shift for the logged-in operator.
 * Accepts starting cash amount and optional denomination breakdown.
 *
 * Body:
 * {
 *   startingCash: number,
 *   denomination?: Array<{
 *     value: number,
 *     label: string,
 *     type: "NOTE" | "COIN",
 *     count: number,
 *     total: number
 *   }>
 * }
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
    const { startingCash, denomination } = body;

    if (startingCash === undefined || startingCash === null || typeof startingCash !== "number" || startingCash < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid starting cash amount" },
        { status: 400 }
      );
    }

    // Validate denomination breakdown if provided
    let cleanDenomination: any = null;
    if (denomination && Array.isArray(denomination)) {
      cleanDenomination = denomination
        .filter((d: any) => d.count > 0)
        .map((d: any) => ({
          value: Number(d.value),
          label: String(d.label),
          type: d.type === "COIN" ? "COIN" : "NOTE",
          count: Math.max(0, Math.floor(Number(d.count))),
          total: Number(d.value) * Math.max(0, Math.floor(Number(d.count))),
        }));

      if (cleanDenomination.length === 0) {
        cleanDenomination = null;
      }
    }

    // Check if the operator already has an OPEN shift
    const existingOpenShift = await db.posShift.findFirst({
      where: {
        operatorId: session.user.id,
        status: "OPEN",
      },
    });

    if (existingOpenShift) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have an open shift. Close it before starting a new one.",
          existingShiftId: existingOpenShift.id,
        },
        { status: 409 }
      );
    }

    // Create the new shift
    const shift = await db.posShift.create({
      data: {
        operatorId: session.user.id,
        startingCash: startingCash,
        expectedCash: startingCash, // starts equal to drawer cash
        status: "OPEN",
        denomination: cleanDenomination as any,
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const shiftAny = shift as any;
    return NextResponse.json({
      success: true,
      shift: {
        id: shift.id,
        operatorId: shift.operatorId,
        operatorName: shiftAny.operator?.name || shiftAny.operator?.email || "Unknown",
        startTime: shift.startTime.toISOString(),
        startingCash: shift.startingCash,
        expectedCash: shift.expectedCash,
        status: shift.status,
        denomination: shift.denomination,
      },
    });
  } catch (error) {
    console.error("[POS Shift Start] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
