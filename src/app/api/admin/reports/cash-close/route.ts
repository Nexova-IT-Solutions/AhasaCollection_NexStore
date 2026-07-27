import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/** Asia/Colombo is UTC+5:30 */
const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Convert a local YYYY-MM-DD string (Asia/Colombo) into correct UTC Date boundaries.
 */
function colomboDateToUtcRange(localDateStr: string): [Date, Date] {
  const localMidnight = new Date(`${localDateStr}T00:00:00.000`);
  const startUTC = new Date(localMidnight.getTime() - COLOMBO_OFFSET_MS);
  const endUTC   = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return [startUTC, endUTC];
}

/**
 * GET /api/admin/reports/cash-close?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&shiftId=XXX
 *
 * Returns PosShift reconciliation data:
 *  - If shiftId is provided, returns detailed single shift metrics including cash count breakdown.
 *  - If date range is provided, returns summary grids of historical shifts.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const canAccess =
      hasPermission(session, "reports.cash_close") ||
      hasPermission(session, "pos.shift_manage");

    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get("shiftId");

    // Single shift breakdown details
    if (shiftId) {
      const shift = await db.posShift.findUnique({
        where: { id: shiftId },
        include: {
          operator: {
            select: { id: true, name: true, email: true },
          },
          cashCounts: true,
          orders: {
            where: { paymentStatus: "PAID" },
            select: {
              total: true,
              paymentMethod: true,
              giftCardDeduction: true,
              gatewayResponse: true,
            },
          },
        },
      });

      if (!shift) {
        return NextResponse.json(
          { success: false, message: "Shift not found" },
          { status: 404 }
        );
      }

      let expectedCash = shift.expectedCash;
      let expectedCredit = shift.expectedCredit;
      let expectedDebit = shift.expectedDebit ?? 0;
      let expectedGiftCard = shift.expectedGiftCard ?? 0;
      const totalOrders = shift.orders.length;

      if (shift.status === "OPEN") {
        let cashSalesSum = 0;
        let creditSalesSum = 0;
        let debitSalesSum = 0;
        let giftCardSalesSum = 0;

        for (const order of shift.orders) {
          const orderNetTotal = order.total - (order.giftCardDeduction || 0);

          switch (order.paymentMethod) {
            case "POS_CASH":
              cashSalesSum += orderNetTotal;
              break;
            case "CREDIT_CARD":
            case "POS_CARD":
              creditSalesSum += orderNetTotal;
              break;
            case "DEBIT_CARD":
              debitSalesSum += orderNetTotal;
              break;
            case "POS_GIFT_CARD":
              giftCardSalesSum += orderNetTotal;
              break;
            case "POS_SPLIT": {
              const gw = order.gatewayResponse as any;
              if (gw && gw.splitPayments && Array.isArray(gw.splitPayments)) {
                for (const sp of gw.splitPayments) {
                  if (sp.method === "POS_CASH") {
                    cashSalesSum += sp.amount;
                  } else if (sp.method === "CREDIT_CARD" || sp.method === "POS_CARD") {
                    creditSalesSum += sp.amount;
                  } else if (sp.method === "DEBIT_CARD") {
                    debitSalesSum += sp.amount;
                  } else if (sp.method === "POS_GIFT_CARD") {
                    giftCardSalesSum += sp.amount;
                  }
                }
              } else {
                cashSalesSum += orderNetTotal;
              }
              break;
            }
            default:
              break;
          }
        }
        expectedCash = Math.round((shift.openingCash + cashSalesSum) * 100) / 100;
        expectedCredit = Math.round(creditSalesSum * 100) / 100;
        expectedDebit = Math.round(debitSalesSum * 100) / 100;
        expectedGiftCard = Math.round(giftCardSalesSum * 100) / 100;
      }

      return NextResponse.json({
        success: true,
        shift: {
          id: shift.id,
          operatorId: shift.operatorId,
          operatorName: shift.operator.name || shift.operator.email || "Unknown",
          openedAt: shift.openedAt.toISOString(),
          closedAt: shift.closedAt?.toISOString() || null,
          status: shift.status,
          openingCash: shift.openingCash,
          expectedCash,
          actualCash: shift.actualCash,
          variance: shift.variance,
          expectedCredit,
          actualCredit: shift.actualCredit,
          creditVariance: shift.creditVariance,
          expectedDebit,
          actualDebit: shift.actualDebit,
          debitVariance: shift.debitVariance,
          expectedGiftCard,
          actualGiftCard: shift.actualGiftCard,
          giftCardVariance: shift.giftCardVariance,
          notes: shift.notes,
          totalOrders,
          cashCounts: shift.cashCounts.map((cc) => ({
            value: cc.denominationVal,
            quantity: cc.quantity,
            type: cc.type,
          })),
        },
      });
    }

    // Historical range queries — use Colombo-aware date bounds
    const startDateStr = searchParams.get("startDate");
    const endDateStr   = searchParams.get("endDate");

    let startDate: Date, endDate: Date;

    if (startDateStr && endDateStr) {
      [startDate]     = colomboDateToUtcRange(startDateStr);
      [, endDate]     = colomboDateToUtcRange(endDateStr);
    } else {
      // Default: today in Colombo local time
      const colomboNow  = new Date(Date.now() + COLOMBO_OFFSET_MS);
      const localToday  = colomboNow.toISOString().slice(0, 10);
      [startDate, endDate] = colomboDateToUtcRange(localToday);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const shifts = await db.posShift.findMany({
      where: {
        openedAt: { gte: startDate, lte: endDate },
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    const shiftRecords = shifts.map((s) => {
      const operatorName = s.operator.name || s.operator.email || "Unknown";

      return {
        shiftId: s.id,
        operatorId: s.operatorId,
        operatorName,
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt?.toISOString() || null,
        status: s.status,
        openingCash: s.openingCash,
        expectedCash: Math.round(s.expectedCash * 100) / 100,
        actualCash: s.actualCash !== null ? Math.round((s.actualCash ?? 0) * 100) / 100 : null,
        expectedCredit: Math.round(s.expectedCredit * 100) / 100,
        actualCredit: s.actualCredit !== null ? Math.round((s.actualCredit ?? 0) * 100) / 100 : null,
        expectedDebit: Math.round((s.expectedDebit ?? 0) * 100) / 100,
        actualDebit: s.actualDebit !== null ? Math.round((s.actualDebit ?? 0) * 100) / 100 : null,
        expectedGiftCard: Math.round((s.expectedGiftCard ?? 0) * 100) / 100,
        actualGiftCard: s.actualGiftCard !== null ? Math.round((s.actualGiftCard ?? 0) * 100) / 100 : null,
        variance: s.status === "CLOSED" ? Math.round(s.variance * 100) / 100 : null,
        creditVariance: s.status === "CLOSED" && s.creditVariance !== null ? Math.round((s.creditVariance ?? 0) * 100) / 100 : null,
        debitVariance: s.status === "CLOSED" && s.debitVariance !== null ? Math.round((s.debitVariance ?? 0) * 100) / 100 : null,
        giftCardVariance: s.status === "CLOSED" && s.giftCardVariance !== null ? Math.round((s.giftCardVariance ?? 0) * 100) / 100 : null,
        totalOrders: s._count.orders,
        notes: s.notes,
      };
    });

    const closedShifts = shiftRecords.filter((s) => s.status === "CLOSED");

    const summary = {
      totalShifts: shiftRecords.length,
      closedShifts: closedShifts.length,
      openShifts: shiftRecords.length - closedShifts.length,
      totalExpectedCash: Math.round(
        closedShifts.reduce((sum, s) => sum + s.expectedCash, 0) * 100
      ) / 100,
      totalActualCash: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.actualCash ?? 0), 0) * 100
      ) / 100,
      totalCashVariance: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.variance ?? 0), 0) * 100
      ) / 100,
      totalExpectedCredit: Math.round(
        closedShifts.reduce((sum, s) => sum + s.expectedCredit, 0) * 100
      ) / 100,
      totalActualCredit: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.actualCredit ?? 0), 0) * 100
      ) / 100,
      totalCreditVariance: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.creditVariance ?? 0), 0) * 100
      ) / 100,
      totalExpectedDebit: Math.round(
        closedShifts.reduce((sum, s) => sum + s.expectedDebit, 0) * 100
      ) / 100,
      totalActualDebit: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.actualDebit ?? 0), 0) * 100
      ) / 100,
      totalDebitVariance: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.debitVariance ?? 0), 0) * 100
      ) / 100,
      totalExpectedGiftCard: Math.round(
        closedShifts.reduce((sum, s) => sum + s.expectedGiftCard, 0) * 100
      ) / 100,
      totalActualGiftCard: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.actualGiftCard ?? 0), 0) * 100
      ) / 100,
      totalGiftCardVariance: Math.round(
        closedShifts.reduce((sum, s) => sum + (s.giftCardVariance ?? 0), 0) * 100
      ) / 100,
      totalOrders: closedShifts.reduce((sum, s) => sum + s.totalOrders, 0),
    };

    return NextResponse.json({
      success: true,
      shifts: shiftRecords,
      summary,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Reports Cash Close] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
