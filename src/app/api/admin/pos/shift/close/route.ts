import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN"];

const closeShiftSchema = z.object({
  shiftId: z.string().min(1, "Shift ID is required"),
  denominations: z.array(
    z.object({
      value: z.number().positive("Denomination value must be positive"),
      quantity: z.number().int().nonnegative("Quantity must be a non-negative number"),
    })
  ).min(1, "At least one denomination entry is required"),
  actualCredit: z.number().nonnegative().optional().default(0),
  actualDebit: z.number().nonnegative().optional().default(0),
  actualGiftCard: z.number().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

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
    const parsedPayload = closeShiftSchema.safeParse(body);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { success: false, message: parsedPayload.error.issues[0].message },
        { status: 400 }
      );
    }

    const { shiftId, denominations, actualCredit, actualDebit, actualGiftCard, notes } = parsedPayload.data;

    const result = await db.$transaction(async (tx) => {
      // 1. Retrieve the active OPEN shift
      const shift = await tx.posShift.findUnique({
        where: { id: shiftId },
      });

      if (!shift) {
        throw new Error("SHIFT_NOT_FOUND");
      }

      if (shift.status === "CLOSED") {
        throw new Error("SHIFT_ALREADY_CLOSED");
      }

      // 2. Fetch all orders completed under this shift
      const orders = await tx.order.findMany({
        where: {
          OR: [
            { posShiftId: shiftId },
            { shiftId: shiftId },
          ],
          paymentStatus: "PAID", // completed / paid orders
        },
      });

      // 3. Aggregate payments by type
      let cashSalesSum = 0;
      let creditSalesSum = 0;
      let debitSalesSum = 0;
      let giftCardSalesSum = 0;

      for (const order of orders) {
        const orderNetTotal = order.total - (order.giftCardDeduction || 0);

        if (order.paymentMethod === "POS_CASH" || order.paymentMethod === "COD") {
          cashSalesSum += orderNetTotal;
        } else if (order.paymentMethod === "CREDIT_CARD" || order.paymentMethod === "POS_CARD") {
          creditSalesSum += orderNetTotal;
        } else if (order.paymentMethod === "DEBIT_CARD") {
          debitSalesSum += orderNetTotal;
        } else if (order.paymentMethod === "POS_GIFT_CARD") {
          giftCardSalesSum += orderNetTotal;
        } else if (order.paymentMethod === "POS_SPLIT") {
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
            // Split fallback: assume cash
            cashSalesSum += orderNetTotal;
          }
        }
      }

      // 4. Calculate actual cash from denomination quantities
      const actualCash = denominations.reduce(
        (sum, item) => sum + item.value * item.quantity,
        0
      );

      // 5. Compute mismatch statistics
      const expectedCash = shift.openingCash + cashSalesSum;
      const variance = actualCash - expectedCash;
      const expectedCredit = creditSalesSum;
      const creditVariance = actualCredit - expectedCredit;
      const expectedDebit = debitSalesSum;
      const debitVariance = actualDebit - expectedDebit;
      const expectedGiftCard = giftCardSalesSum;
      const giftCardVariance = actualGiftCard - expectedGiftCard;

      // 6. Save closing cash counts
      const cashCountData = denominations.map((d) => ({
        shiftId: shift.id,
        denominationVal: d.value,
        quantity: d.quantity,
        type: "CLOSING" as const,
      }));

      await tx.shiftCashCount.createMany({
        data: cashCountData,
      });

      // Save reconciliation summary details per payment method
      const reconciliationRecords = [
        {
          shiftId: shift.id,
          paymentMethod: "POS_CASH",
          systemAmount: expectedCash,
          operatorAmount: actualCash,
          variance: variance,
          status: Math.abs(variance) <= 0.01 ? "MATCHED" : "MISMATCHED",
        },
        {
          shiftId: shift.id,
          paymentMethod: "CREDIT_CARD",
          systemAmount: expectedCredit,
          operatorAmount: actualCredit,
          variance: creditVariance,
          status: Math.abs(creditVariance) <= 0.01 ? "MATCHED" : "MISMATCHED",
        },
        {
          shiftId: shift.id,
          paymentMethod: "DEBIT_CARD",
          systemAmount: expectedDebit,
          operatorAmount: actualDebit,
          variance: debitVariance,
          status: Math.abs(debitVariance) <= 0.01 ? "MATCHED" : "MISMATCHED",
        },
        {
          shiftId: shift.id,
          paymentMethod: "POS_GIFT_CARD",
          systemAmount: expectedGiftCard,
          operatorAmount: actualGiftCard,
          variance: giftCardVariance,
          status: Math.abs(giftCardVariance) <= 0.01 ? "MATCHED" : "MISMATCHED",
        },
      ];

      await tx.shiftReconciliation.createMany({
        data: reconciliationRecords,
      });

      // 7. Atomically close the session
      const closedShift = await tx.posShift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          actualCash,
          expectedCash,
          variance,
          // Legacy support fields
          endTime: new Date(),
          expectedCredit,
          actualCredit,
          cashVariance: variance,
          creditVariance,
          expectedDebit,
          actualDebit,
          debitVariance: debitVariance,
          expectedGiftCard,
          actualGiftCard,
          giftCardVariance,
          notes: notes || null,
        },
      });

      return {
        closedShift,
        cashSalesSum,
        creditSalesSum,
        debitSalesSum,
        giftCardSalesSum,
        expectedCash,
        actualCash,
        variance,
      };
    });

    return NextResponse.json({
      success: true,
      message: "POS session closed successfully",
      summary: {
        shiftId: result.closedShift.id,
        openedAt: result.closedShift.openedAt.toISOString(),
        closedAt: result.closedShift.closedAt?.toISOString(),
        openingCash: result.closedShift.openingCash,
        cashSales: result.cashSalesSum,
        expectedCash: result.expectedCash,
        actualCash: result.actualCash,
        variance: result.variance,
        creditSales: result.creditSalesSum,
        actualCredit,
        debitSales: result.debitSalesSum,
        actualDebit,
        giftCardSales: result.giftCardSalesSum,
        actualGiftCard,
        notes: result.closedShift.notes,
      },
    });


  } catch (error: any) {
    console.error("[POS Shift Close] Error:", error);

    if (error.message === "SHIFT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Shift not found" },
        { status: 404 }
      );
    }

    if (error.message === "SHIFT_ALREADY_CLOSED") {
      return NextResponse.json(
        { success: false, message: "This POS shift is already closed" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to close POS shift" },
      { status: 500 }
    );
  }
}
