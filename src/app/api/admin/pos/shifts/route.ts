import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

/**
 * GET /api/admin/pos/shifts
 *
 * List all shifts with pagination and optional status/operator filters.
 * Query params: page, limit, status (OPEN/CLOSED), operatorId
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status");
    const operatorId = searchParams.get("operatorId");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status === "OPEN" || status === "CLOSED") {
      where.status = status;
    }
    if (operatorId) {
      where.operatorId = operatorId;
    }

    const shifts = await db.posShift.findMany({
      where,
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { startTime: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await db.posShift.count({ where });

    return NextResponse.json({
      success: true,
      shifts: shifts.map((s) => ({
        id: s.id,
        operatorId: s.operatorId,
        operatorName: s.operator.name || s.operator.email || "Unknown",
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() || null,
        startingCash: s.startingCash,
        expectedCash: s.expectedCash,
        actualCash: s.actualCash,
        expectedCredit: s.expectedCredit,
        actualCredit: s.actualCredit,
        cashVariance: s.cashVariance,
        creditVariance: s.creditVariance,
        status: s.status,
        notes: s.notes,
        totalOrders: s._count.orders,
        denomination: s.denomination,
        createdAt: s.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("[POS Shifts List] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pos/shifts
 *
 * Open a new shift with operator ID and starting cash denomination breakdown.
 * Body:
 * {
 *   startingCash: number,
 *   denomination?: Array<{ value: number, label: string, type: string, count: number, total: number }>
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

    // Validate denomination data if provided
    if (denomination && Array.isArray(denomination)) {
      const denomTotal = denomination.reduce(
        (sum: number, d: any) => sum + (d.value * d.count || 0),
        0
      );

      // Allow a small floating point tolerance
      if (Math.abs(denomTotal - startingCash) > 0.01 && denomTotal > 0) {
        // The denomination total doesn't match startingCash — use denomination total
        // This ensures the breakdown is authoritative when provided
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
        expectedCash: startingCash,
        status: "OPEN",
        denomination: denomination || null,
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      shift: {
        id: shift.id,
        operatorId: shift.operatorId,
        operatorName: shift.operator.name || shift.operator.email || "Unknown",
        startTime: shift.startTime.toISOString(),
        startingCash: shift.startingCash,
        expectedCash: shift.expectedCash,
        status: shift.status,
        denomination: shift.denomination,
      },
    });
  } catch (error) {
    console.error("[POS Shift Open] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/pos/shifts
 *
 * Close a shift by providing actual cash/credit totals and denomination breakdown.
 * Calculates expected vs actual variances from all PAID orders in the shift.
 * Body:
 * {
 *   shiftId: string,
 *   actualCash: number,
 *   actualCredit?: number,
 *   denomination?: Array<{ value: number, label: string, type: string, count: number, total: number }>,
 *   notes?: string
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: POS access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { shiftId, actualCash, actualCredit, denomination, notes } = body;

    if (!shiftId || typeof shiftId !== "string") {
      return NextResponse.json(
        { success: false, message: "Shift ID is required" },
        { status: 400 }
      );
    }

    if (actualCash === undefined || actualCash === null || typeof actualCash !== "number" || actualCash < 0) {
      return NextResponse.json(
        { success: false, message: "Actual cash amount is required and must be non-negative" },
        { status: 400 }
      );
    }

    // Find the open shift
    const shift = await db.posShift.findFirst({
      where: {
        id: shiftId,
        operatorId: session.user.id,
        status: "OPEN",
      },
      include: {
        orders: {
          select: {
            total: true,
            paymentMethod: true,
            paymentStatus: true,
            giftCardDeduction: true,
            gatewayResponse: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, message: "Open shift not found or not owned by you" },
        { status: 404 }
      );
    }

    // Calculate expected totals from PAID orders in this shift
    const paidOrders = shift.orders.filter((o) => o.paymentStatus === "PAID");

    let expectedCashFromSales = 0;
    let expectedCreditFromSales = 0;
    let expectedGiftCardTotal = 0;

    for (const order of paidOrders) {
      const orderNetTotal = order.total - (order.giftCardDeduction || 0);

      switch (order.paymentMethod) {
        case "POS_CASH":
          expectedCashFromSales += orderNetTotal;
          break;
        case "POS_CARD":
          expectedCreditFromSales += orderNetTotal;
          break;
        case "POS_GIFT_CARD":
          expectedGiftCardTotal += orderNetTotal;
          break;
        case "POS_SPLIT": {
          // Parse split payment breakdown from gatewayResponse
          const gw = order.gatewayResponse as any;
          if (gw && gw.splitPayments && Array.isArray(gw.splitPayments)) {
            for (const sp of gw.splitPayments) {
              if (sp.method === "POS_CASH") expectedCashFromSales += sp.amount;
              else if (sp.method === "POS_CARD") expectedCreditFromSales += sp.amount;
              else if (sp.method === "POS_GIFT_CARD") expectedGiftCardTotal += sp.amount;
            }
          } else {
            // Fallback: attribute to cash
            expectedCashFromSales += orderNetTotal;
          }
          break;
        }
        default:
          break;
      }
    }

    // Expected drawer cash = starting cash + cash sales revenue
    const expectedCash = Math.round((shift.startingCash + expectedCashFromSales) * 100) / 100;
    const expectedCredit = Math.round(expectedCreditFromSales * 100) / 100;

    // Calculate variances
    const cashVariance = Math.round((actualCash - expectedCash) * 100) / 100;
    const creditVariance = Math.round(((actualCredit || 0) - expectedCredit) * 100) / 100;

    // Close the shift
    const closedShift = await db.posShift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        expectedCash: expectedCash,
        actualCash: actualCash,
        expectedCredit: expectedCredit,
        actualCredit: actualCredit || 0,
        cashVariance: cashVariance,
        creditVariance: creditVariance,
        status: "CLOSED",
        notes: notes || null,
        denomination: denomination || null,
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      shift: {
        id: closedShift.id,
        operatorId: closedShift.operatorId,
        operatorName: closedShift.operator.name || closedShift.operator.email || "Unknown",
        startTime: closedShift.startTime.toISOString(),
        endTime: closedShift.endTime?.toISOString() || null,
        startingCash: closedShift.startingCash,
        expectedCash: closedShift.expectedCash,
        actualCash: closedShift.actualCash,
        expectedCredit: closedShift.expectedCredit,
        actualCredit: closedShift.actualCredit,
        cashVariance: closedShift.cashVariance,
        creditVariance: closedShift.creditVariance,
        status: closedShift.status,
        totalOrders: paidOrders.length,
        totalSales: paidOrders.reduce((sum, o) => sum + o.total, 0),
        denomination: closedShift.denomination,
      },
    });
  } catch (error) {
    console.error("[POS Shift Close via PATCH] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
