import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN"];

const openShiftSchema = z.object({
  denominations: z.array(
    z.object({
      value: z.number().positive("Denomination value must be positive"),
      quantity: z.number().int().nonnegative("Quantity must be a non-negative number"),
    })
  ).min(1, "At least one denomination entry is required"),
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
    const parsedPayload = openShiftSchema.safeParse(body);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { success: false, message: parsedPayload.error.errors[0].message },
        { status: 400 }
      );
    }

    const { denominations, notes } = parsedPayload.data;
    const operatorId = session.user.id;

    // Use a robust Prisma transaction for isolation
    const result = await db.$transaction(async (tx) => {
      // 1. Check for any active OPEN shift for this operator
      const activeShift = await tx.posShift.findFirst({
        where: {
          operatorId,
          status: "OPEN",
        },
      });

      if (activeShift) {
        throw new Error("ACTIVE_SHIFT_EXISTS");
      }

      // 2. Compute opening cash from denomination inputs
      const openingCash = denominations.reduce(
        (sum, item) => sum + item.value * item.quantity,
        0
      );

      // 3. Create the POS Shift
      const shift = await tx.posShift.create({
        data: {
          operatorId,
          status: "OPEN",
          openedAt: new Date(),
          openingCash,
          expectedCash: openingCash,
          // Legacy fields for backward compatibility
          startingCash: openingCash,
          expectedCredit: 0,
          actualCredit: 0,
          notes: notes || null,
        },
      });

      // 4. Save opening shift cash count inventory snapshot
      const cashCountData = denominations.map((d) => ({
        shiftId: shift.id,
        denominationVal: d.value,
        quantity: d.quantity,
        type: "OPENING" as const,
      }));

      await tx.shiftCashCount.createMany({
        data: cashCountData,
      });

      return { shift, openingCash };
    });

    return NextResponse.json({
      success: true,
      message: "POS session initialized successfully",
      shift: {
        id: result.shift.id,
        operatorId: result.shift.operatorId,
        status: result.shift.status,
        openedAt: result.shift.openedAt.toISOString(),
        openingCash: result.openingCash,
        expectedCash: result.openingCash,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("[POS Shift Open] Error:", error);

    if (error.message === "ACTIVE_SHIFT_EXISTS") {
      return NextResponse.json(
        { success: false, message: "You already have an active open shift. Please close it first." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to initialize POS shift" },
      { status: 500 }
    );
  }
}
