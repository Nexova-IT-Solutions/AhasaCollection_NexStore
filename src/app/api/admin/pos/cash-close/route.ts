import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * POS payment methods that this system accepts.
 * Defines the full set of payment types so we always return all
 * categories — even when a given day has zero transactions for a type.
 */
const POS_PAYMENT_METHODS = [
  { key: "POS_CASH",      label: "Cash",              icon: "banknote"     },
  { key: "CREDIT_CARD",   label: "Credit Card",       icon: "credit-card"  },
  { key: "DEBIT_CARD",    label: "Debit Card",        icon: "credit-card"  },
  { key: "POS_CARD",      label: "Card (Legacy)",     icon: "credit-card"  },
  { key: "POS_GIFT_CARD", label: "Gift Voucher",       icon: "gift"         },
  { key: "POS_SPLIT",     label: "Split Payment",      icon: "split"        },
] as const;

type PosPaymentMethodKey = (typeof POS_PAYMENT_METHODS)[number]["key"];

/** Asia/Colombo offset in minutes (UTC+5:30) */
const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Convert a local YYYY-MM-DD string (in Asia/Colombo time) to UTC Date boundaries.
 * Returns [startOfDayUTC, endOfDayUTC].
 */
function colomboDateToUtcRange(localDateStr: string): [Date, Date] {
  // Midnight in Colombo = midnight local − 5h30m in UTC
  const localMidnight = new Date(`${localDateStr}T00:00:00.000`);
  const startUTC = new Date(localMidnight.getTime() - COLOMBO_OFFSET_MS);
  const endUTC   = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return [startUTC, endUTC];
}

/**
 * Aggregate PAID orders for a given shift or date range into per-payment-method buckets.
 * Also correctly unpacks POS_SPLIT gatewayResponse entries.
 */
function aggregateOrders(
  orders: Array<{
    total: number;
    paymentMethod: string;
    giftCardDeduction: number | null;
    gatewayResponse: unknown;
  }>
): Record<PosPaymentMethodKey, number> {
  const totals: Record<string, number> = {
    POS_CASH:      0,
    CREDIT_CARD:   0,
    DEBIT_CARD:    0,
    POS_CARD:      0,
    POS_GIFT_CARD: 0,
    POS_SPLIT:     0,
  };

  for (const order of orders) {
    const netTotal = order.total - (order.giftCardDeduction ?? 0);

    if (order.paymentMethod === "POS_SPLIT") {
      // Unpack split into constituent methods
      const gw = order.gatewayResponse as Record<string, unknown> | null;
      if (gw && Array.isArray(gw.splitPayments)) {
        let splitAccountedFor = 0;
        for (const sp of gw.splitPayments as Array<{ method: string; amount: number }>) {
          const bucket = sp.method as PosPaymentMethodKey;
          if (bucket in totals) {
            totals[bucket] += sp.amount ?? 0;
            splitAccountedFor += sp.amount ?? 0;
          }
        }
        // Any unaccounted remainder falls back to cash
        const remainder = Math.round((netTotal - splitAccountedFor) * 100) / 100;
        if (remainder > 0.005) {
          totals["POS_CASH"] += remainder;
        }
      } else {
        // No split detail → attribute full net to cash (conservative fallback)
        totals["POS_CASH"] += netTotal;
      }
    } else if (order.paymentMethod in totals) {
      totals[order.paymentMethod] += netTotal;
    }
    // Non-POS payment methods (COD, BANK_TRANSFER, etc.) are intentionally ignored
    // for POS cash-close purposes.
  }

  // Round all values to 2 decimal places
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key] * 100) / 100;
  }

  return totals as Record<PosPaymentMethodKey, number>;
}

/**
 * Build the structured payment summary array that the frontend displays.
 * Ensures ALL accepted payment types appear — even with 0 values.
 */
function buildPaymentSummary(
  aggregated: Record<PosPaymentMethodKey, number>,
  operatorEnteredAmounts?: Partial<Record<PosPaymentMethodKey, number>>
) {
  return POS_PAYMENT_METHODS.map((pm) => {
    const systemAmount    = aggregated[pm.key] ?? 0;
    const operatorAmount  = operatorEnteredAmounts?.[pm.key] ?? null;
    const variance        =
      operatorAmount !== null
        ? Math.round((operatorAmount - systemAmount) * 100) / 100
        : null;

    return {
      paymentMethod:  pm.key,
      label:          pm.label,
      icon:           pm.icon,
      systemAmount,
      operatorAmount,
      variance,
    };
  });
}

// ─── Route Handler ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/pos/cash-close
 *
 * Query Parameters:
 *   - shiftId?      → Fetch EOD summary for a specific POS shift
 *   - date?         → Local date YYYY-MM-DD (Asia/Colombo). Defaults to today.
 *   - startDate?    → Range start (with endDate)
 *   - endDate?      → Range end
 *
 * Returns:
 *   - paymentSummary[]: Per-payment-type breakdown with system-calculated and operator amounts
 *   - totals: Aggregate totals across all payment methods
 *   - shiftInfo: Metadata about the shift(s) queried
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Require either cash_close report permission or POS shift_manage permission
    const canAccess =
      hasPermission(session, "reports.cash_close") ||
      hasPermission(session, "pos.shift_manage");

    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions to view EOD cash close data." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const shiftId   = searchParams.get("shiftId");
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam   = searchParams.get("endDate");

    // ─── Branch 1: Single shift detail ──────────────────────────────────
    if (shiftId) {
      const shift = await db.posShift.findUnique({
        where: { id: shiftId },
        include: {
          operator: { select: { id: true, name: true, email: true } },
          orders: {
            where: { paymentStatus: "PAID" },
            select: {
              id: true,
              total: true,
              paymentMethod: true,
              giftCardDeduction: true,
              gatewayResponse: true,
              createdAt: true,
            },
          },
          cashCounts: {
            orderBy: { denominationVal: "desc" },
          },
          reconciliations: true,
        },
      });

      if (!shift) {
        return NextResponse.json({ success: false, message: "Shift not found." }, { status: 404 });
      }

      const aggregated     = aggregateOrders(shift.orders);
      const totalSystemAmount = Object.values(aggregated).reduce((a, b) => a + b, 0);

      // Build operator entered amounts map
      const operatorEnteredAmounts: Partial<Record<PosPaymentMethodKey, number>> = {};
      if (shift.status === "CLOSED" && shift.reconciliations.length > 0) {
        for (const rec of shift.reconciliations) {
          operatorEnteredAmounts[rec.paymentMethod as PosPaymentMethodKey] = rec.operatorAmount;
        }
      }
      const paymentSummary = buildPaymentSummary(aggregated, operatorEnteredAmounts);

      const totalOrderCount = shift.orders.length;
      const totalSales      = shift.orders.reduce((s, o) => s + o.total, 0);

      return NextResponse.json({
        success: true,
        mode: "shift",
        shiftInfo: {
          id:            shift.id,
          operatorId:    shift.operatorId,
          operatorName:  shift.operator.name || shift.operator.email || "Unknown",
          openedAt:      shift.openedAt.toISOString(),
          closedAt:      shift.closedAt?.toISOString() ?? null,
          status:        shift.status,
          openingCash:   shift.openingCash,
          expectedCash:  shift.expectedCash,
          actualCash:    shift.actualCash,
          variance:      shift.variance,
          expectedCredit: shift.expectedCredit,
          actualCredit:  shift.actualCredit,
          creditVariance: shift.creditVariance,
          expectedDebit:  shift.expectedDebit,
          actualDebit:    shift.actualDebit,
          debitVariance:  shift.debitVariance,
          expectedGiftCard: shift.expectedGiftCard,
          actualGiftCard:   shift.actualGiftCard,
          giftCardVariance: shift.giftCardVariance,
          notes:         shift.notes,
          totalOrders:   totalOrderCount,
          totalSales:    Math.round(totalSales * 100) / 100,
          cashCounts:    shift.cashCounts.map((cc) => ({
            denominationVal: cc.denominationVal,
            quantity:        cc.quantity,
            type:            cc.type,
            subtotal:        cc.denominationVal * cc.quantity,
          })),
        },
        paymentSummary,
        totals: {
          systemCalculated: Math.round(totalSystemAmount * 100) / 100,
          orderCount:       totalOrderCount,
        },
      });
    }

    // ─── Branch 2: Date range / single day query ─────────────────────────
    // Determine the UTC bounds from Colombo-local dates
    let startUTC: Date, endUTC: Date;

    if (startDateParam && endDateParam) {
      [startUTC]      = colomboDateToUtcRange(startDateParam);
      [, endUTC]      = colomboDateToUtcRange(endDateParam);
    } else {
      // Default to today in Colombo time
      const colomboNow  = new Date(Date.now() + COLOMBO_OFFSET_MS);
      const localToday  = colomboNow.toISOString().slice(0, 10);
      const targetDate  = dateParam ?? localToday;
      [startUTC, endUTC] = colomboDateToUtcRange(targetDate);
    }

    if (isNaN(startUTC.getTime()) || isNaN(endUTC.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Fetch all PAID orders in the date window (direct order-level query)
    const orders = await db.order.findMany({
      where: {
        paymentStatus: "PAID",
        orderSource:   "POS",
        createdAt:     { gte: startUTC, lte: endUTC },
      },
      select: {
        id:               true,
        total:            true,
        paymentMethod:    true,
        giftCardDeduction: true,
        gatewayResponse:  true,
        createdAt:        true,
        posShiftId:       true,
        shiftId:          true,
      },
    });

    // Also fetch shift-level records to provide richer metadata
    const shifts = await db.posShift.findMany({
      where: {
        openedAt: { gte: startUTC, lte: endUTC },
      },
      include: {
        operator: { select: { id: true, name: true, email: true } },
        _count:   { select: { orders: true } },
      },
      orderBy: { openedAt: "desc" },
    });

    // Fetch reconciliations for shifts in this date range
    const reconciliations = await db.shiftReconciliation.findMany({
      where: {
        shift: {
          openedAt: { gte: startUTC, lte: endUTC },
        },
      },
    });

    const operatorEnteredAmounts: Partial<Record<PosPaymentMethodKey, number>> = {};
    const closedShifts = shifts.filter((s) => s.status === "CLOSED");
    if (closedShifts.length > 0) {
      for (const pm of POS_PAYMENT_METHODS) {
        operatorEnteredAmounts[pm.key] = 0;
      }
      for (const rec of reconciliations) {
        const key = rec.paymentMethod as PosPaymentMethodKey;
        if (key in operatorEnteredAmounts) {
          operatorEnteredAmounts[key] = (operatorEnteredAmounts[key] ?? 0) + rec.operatorAmount;
        }
      }
    }

    const aggregated        = aggregateOrders(orders);
    const totalSystemAmount = Object.values(aggregated).reduce((a, b) => a + b, 0);
    const paymentSummary    = buildPaymentSummary(aggregated, operatorEnteredAmounts);
    const totalOrderCount   = orders.length;
    const totalSales        = orders.reduce((s, o) => s + o.total, 0);

    const shiftSummaries = shifts.map((s) => ({
      id:           s.id,
      operatorName: s.operator.name || s.operator.email || "Unknown",
      openedAt:     s.openedAt.toISOString(),
      closedAt:     s.closedAt?.toISOString() ?? null,
      status:       s.status,
      openingCash:  s.openingCash,
      expectedCash: s.expectedCash,
      actualCash:   s.actualCash,
      variance:     s.variance,
      expectedCredit: s.expectedCredit,
      actualCredit:   s.actualCredit,
      creditVariance: s.creditVariance,
      expectedDebit:  s.expectedDebit,
      actualDebit:    s.actualDebit,
      debitVariance:  s.debitVariance,
      expectedGiftCard: s.expectedGiftCard,
      actualGiftCard:   s.actualGiftCard,
      giftCardVariance: s.giftCardVariance,
      totalOrders:  s._count.orders,
    }));

    return NextResponse.json({
      success: true,
      mode:  "date-range",
      dateRange: {
        startDate: startUTC.toISOString(),
        endDate:   endUTC.toISOString(),
        localDate: dateParam ?? startDateParam,
      },
      paymentSummary,
      totals: {
        systemCalculated: Math.round(totalSystemAmount * 100) / 100,
        orderCount:       totalOrderCount,
        totalSales:       Math.round(totalSales * 100) / 100,
      },
      shifts: shiftSummaries,
    });
  } catch (error) {
    console.error("[POS Cash Close] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

