import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

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
    const { shiftId, actualCash, actualCredit, actualDebit, denomination, notes } = body;

    if (!shiftId || typeof shiftId !== "string") {
      return NextResponse.json(
        { success: false, message: "Shift ID is required" },
        { status: 400 }
      );
    }

    if (actualCash === undefined || actualCash === null || typeof actualCash !== "number" || actualCash < 0) {
      return NextResponse.json(
        { success: false, message: "Actual cash amount is required" },
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

    // Calculate expected totals from orders in this shift
    const paidOrders = shift.orders.filter(
      (o) => o.paymentStatus === "PAID"
    );

    let expectedCashFromSales = 0;
    let expectedCreditFromSales = 0;
    let expectedDebitFromSales = 0;
    let expectedGiftCardTotal = 0;

    for (const order of paidOrders) {
      const orderTotal = order.total - (order.giftCardDeduction || 0);

      switch (order.paymentMethod) {
        case "POS_CASH":
          expectedCashFromSales += orderTotal;
          break;
        case "CREDIT_CARD":
        case "POS_CARD":
        case "POS_MOBILE_TRANSFER":
        case "POS_CREDIT":
          expectedCreditFromSales += orderTotal;
          break;
        case "DEBIT_CARD":
          expectedDebitFromSales += orderTotal;
          break;
        case "POS_GIFT_CARD":
          expectedGiftCardTotal += orderTotal;
          break;
        case "POS_SPLIT":
          const gw = order.gatewayResponse as any;
          if (gw && gw.splitPayments && Array.isArray(gw.splitPayments)) {
            for (const sp of gw.splitPayments) {
              if (sp.method === "POS_CASH") expectedCashFromSales += sp.amount;
              else if (sp.method === "CREDIT_CARD" || sp.method === "POS_CARD" || sp.method === "POS_MOBILE_TRANSFER" || sp.method === "POS_CREDIT") expectedCreditFromSales += sp.amount;
              else if (sp.method === "DEBIT_CARD") expectedDebitFromSales += sp.amount;
              else if (sp.method === "POS_GIFT_CARD") expectedGiftCardTotal += sp.amount;
            }
          } else {
            // Fallback: treat as cash
            expectedCashFromSales += orderTotal;
          }
          break;
        default:
          break;
      }
    }

    // Expected cash = opening cash + cash from sales
    const openingCashAmount = shift.openingCash || shift.startingCash || 0;
    const expectedCash = openingCashAmount + expectedCashFromSales;
    const expectedCredit = expectedCreditFromSales;
    const expectedDebit = expectedDebitFromSales;

    // Calculate variances
    const cashVariance = actualCash - expectedCash;
    const creditVariance = (actualCredit || 0) - expectedCredit;
    const debitVariance = (actualDebit || 0) - expectedDebit;

    // Update the shift
    const closedShift = await db.posShift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        expectedCash: expectedCash,
        actualCash: actualCash,
        expectedCredit: expectedCredit,
        actualCredit: actualCredit || 0,
        expectedDebit: expectedDebit,
        actualDebit: actualDebit || 0,
        cashVariance: cashVariance,
        creditVariance: creditVariance,
        debitVariance: debitVariance,
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
        expectedDebit: closedShift.expectedDebit,
        actualDebit: closedShift.actualDebit,
        cashVariance: closedShift.cashVariance,
        creditVariance: closedShift.creditVariance,
        debitVariance: closedShift.debitVariance,
        status: closedShift.status,
        totalOrders: paidOrders.length,
        totalSales: paidOrders.reduce((sum, o) => sum + o.total, 0),
      },
    });
  } catch (error) {
    console.error("[POS Shift Close] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Retrieve current open shift for the logged-in operator
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const openShift = await db.posShift.findFirst({
      where: {
        operatorId: session.user.id,
        status: "OPEN",
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
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

    if (!openShift) {
      return NextResponse.json({ success: true, shift: null });
    }

    // Dynamic aggregation of payment modes from PAID orders
    let cashSalesSum = 0;
    let creditSalesSum = 0;
    let debitSalesSum = 0;
    let giftCardSalesSum = 0;

    for (const order of openShift.orders) {
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
            // Split fallback: attribute fully to cash
            cashSalesSum += orderNetTotal;
          }
          break;
        }
        default:
          break;
      }
    }

    // Use openingCash as primary, startingCash as backward-compat fallback
    const openingCashAmt = openShift.openingCash || openShift.startingCash || 0;
    const expectedCash = Math.round((openingCashAmt + cashSalesSum) * 100) / 100;
    const expectedCredit = Math.round(creditSalesSum * 100) / 100;
    const expectedDebit = Math.round(debitSalesSum * 100) / 100;
    const totalSales = openShift.orders.reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json({
      success: true,
      shift: {
        id: openShift.id,
        operatorId: openShift.operatorId,
        operatorName: openShift.operator.name || openShift.operator.email || "Unknown",
        startTime: openShift.startTime.toISOString(),
        startingCash: openShift.startingCash,
        expectedCash: expectedCash,
        expectedCredit: expectedCredit,
        expectedDebit: expectedDebit,
        status: openShift.status,
        totalOrders: openShift.orders.length,
        totalSales: totalSales,
      },
    });
  } catch (error) {
    console.error("[POS Shift GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

