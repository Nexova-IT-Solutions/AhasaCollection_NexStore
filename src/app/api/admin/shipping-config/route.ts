import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { ensureShippingConfig, upsertShippingConfig } from "@/lib/shipping-config";

/**
 * GET /api/admin/shipping-config
 * Fetch current shipping configuration (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "STOREFRONT_ADMIN" && session.user.role !== "DEV_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const config = await ensureShippingConfig(db as any);

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("[shipping-config] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch shipping config" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/shipping-config
 * Update shipping configuration (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "STOREFRONT_ADMIN" && session.user.role !== "DEV_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatedConfig = await upsertShippingConfig(db as any, {
      deliveryFee: body.deliveryFee,
      freeDeliveryThreshold: body.freeDeliveryThreshold,
      isFreeDeliveryEnabled: body.isFreeDeliveryEnabled,
      expressDeliveryFee: body.expressDeliveryFee,
      isDeliveryEnabled: body.isDeliveryEnabled,
      deliveryNote: body.deliveryNote,
      currency: body.currency,
    });

    const response = NextResponse.json(
      { success: true, data: updatedConfig },
      { status: 200 }
    );

    if (body.currency) {
      response.cookies.set("store_currency", body.currency, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("[shipping-config] PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update shipping config" },
      { status: 500 }
    );
  }
}
