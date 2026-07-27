import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN"];

const createDenominationSchema = z.object({
  value: z.number().positive("Value must be a positive number"),
  type: z.enum(["NOTE", "COIN"]).optional().default("NOTE"),
  isActive: z.boolean().optional().default(true),
});

const updateDenominationSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

/**
 * GET /api/admin/denominations
 * Lists all denominations, ordered by value descending.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("active") === "true";

    const denominations = await db.denomination.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { value: "desc" },
    });

    return NextResponse.json({
      success: true,
      denominations,
    });
  } catch (error) {
    console.error("[GET Denominations] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/denominations
 * Inserts a new denomination structure or updates status of an existing one.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Check if updating existing status
    if (body.id && typeof body.isActive === "boolean") {
      const parsedUpdate = updateDenominationSchema.safeParse(body);
      if (!parsedUpdate.success) {
        return NextResponse.json(
          { success: false, message: parsedUpdate.error.errors[0].message },
          { status: 400 }
        );
      }

      const updatedDenom = await db.denomination.update({
        where: { id: parsedUpdate.data.id },
        data: { isActive: parsedUpdate.data.isActive },
      });

      return NextResponse.json({
        success: true,
        message: `Denomination updated successfully`,
        denomination: updatedDenom,
      });
    }

    // Otherwise create a new denomination
    const parsedPayload = createDenominationSchema.safeParse(body);
    if (!parsedPayload.success) {
      return NextResponse.json(
        { success: false, message: parsedPayload.error.errors[0].message },
        { status: 400 }
      );
    }

    const { value, isActive, type } = parsedPayload.data;

    // Check if denomination value already exists
    const existing = await db.denomination.findUnique({
      where: { value },
    });

    if (existing) {
      if (existing.isActive === isActive) {
        return NextResponse.json(
          { success: false, message: `Denomination of Rs. ${value} already exists.` },
          { status: 400 }
        );
      }

      // If it exists, reactivate or update it
      const updated = await db.denomination.update({
        where: { value },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        message: `Denomination of Rs. ${value} reactivated successfully.`,
        denomination: updated,
      });
    }

    // Create new
    const denomination = await db.denomination.create({
      data: {
        value,
        isActive,
        type,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Denomination of ${value} created successfully`,
      denomination,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST Denominations] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
