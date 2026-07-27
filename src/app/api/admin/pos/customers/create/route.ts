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
 * POST /api/admin/pos/customers/create
 *
 * Quick-registers a new customer from the POS terminal.
 * Body: { name: string, phone: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone } = body;

    // ─── Validation ──────────────────────────────────────────
    if (name && typeof name !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid customer name format" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "A valid phone number is required (min 3 characters)" },
        { status: 400 }
      );
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name ? name.trim() : "";

    // Check if a user with this phone already exists
    const existing = await db.user.findFirst({
      where: {
        phoneNumber: trimmedPhone,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
      },
    });

    if (existing) {
      // Return the existing customer instead of creating a duplicate
      return NextResponse.json({
        success: true,
        isExisting: true,
        customer: {
          id: existing.id,
          name: existing.name || trimmedName,
          phone: existing.phoneNumber,
          email: existing.email || null,
          outstandingBalance: (existing as any).outstandingBalance || 0,
        },
      });
    }

    // Create the new customer with default USER role
    const newCustomer = await db.user.create({
      data: {
        name: trimmedName,
        phoneNumber: trimmedPhone,
        role: "USER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      isExisting: false,
      customer: {
        id: newCustomer.id,
        name: newCustomer.name || trimmedName,
        phone: newCustomer.phoneNumber,
        email: newCustomer.email || null,
        outstandingBalance: 0,
      },
    });
  } catch (error: any) {
    console.error("[POS Customer Create] Error:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "A customer with this phone number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
