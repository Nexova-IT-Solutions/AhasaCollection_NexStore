import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = [
  "SUPER_ADMIN", "DEV_ADMIN",
  "ADMIN",
  "POS_ADMIN",
  "STOREFRONT_ADMIN",
  "PRODUCT_MANAGER",
  "CUSTOM_ROLE",
];

/**
 * GET /api/admin/pos/customers/search?phone=07XX
 *
 * Searches the User table for customers whose phoneNumber contains the query.
 * Returns up to 5 matches with id, name, phone, and email.
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
    const phone = searchParams.get("phone")?.trim();

    if (!phone || phone.length < 2) {
      return NextResponse.json(
        { success: false, message: "Phone query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const customers = await db.user.findMany({
      where: {
        phoneNumber: {
          contains: phone,
          mode: "insensitive",
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        outstandingBalance: true,
      },
      take: 5,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name || "Unnamed Customer",
        phone: c.phoneNumber || null,
        email: c.email || null,
        outstandingBalance: c.outstandingBalance || 0,
      })),
    });
  } catch (error) {
    console.error("[POS Customer Search] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
