import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 };
  if ((session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) return { error: "Forbidden", status: 403 };
  return { session };
}

/**
 * GET /api/admin/settings
 * Fetch store configuration (SUPER_ADMIN only)
 */
export async function GET(_req: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    let config = await db.shippingConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await db.shippingConfig.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default" },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[settings] GET error:", error);
    return NextResponse.json(
      { message: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings
 * Update store configuration (SUPER_ADMIN only)
 */
export async function PATCH(req: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    // Build update data — only update fields that are present in the body
    const updateData: Record<string, unknown> = {};

    if (typeof body.deliveryFee === "number") updateData.deliveryFee = body.deliveryFee;
    if (typeof body.freeDeliveryThreshold === "number") updateData.freeDeliveryThreshold = body.freeDeliveryThreshold;
    if (typeof body.isFreeDeliveryEnabled === "boolean") updateData.isFreeDeliveryEnabled = body.isFreeDeliveryEnabled;
    if (typeof body.expressDeliveryFee === "number") updateData.expressDeliveryFee = body.expressDeliveryFee;
    if (typeof body.isDeliveryEnabled === "boolean") updateData.isDeliveryEnabled = body.isDeliveryEnabled;
    if (body.deliveryNote !== undefined) updateData.deliveryNote = body.deliveryNote;
    if (typeof body.hideOutOfStockProducts === "boolean") updateData.hideOutOfStockProducts = body.hideOutOfStockProducts;
    if (typeof body.hideEmptyCategories === "boolean") updateData.hideEmptyCategories = body.hideEmptyCategories;

    const config = await db.shippingConfig.update({
      where: { id: "default" },
      data: updateData,
    });

    // Revalidate storefront layouts so the toggle takes effect immediately
    revalidatePath("/", "layout");
    revalidatePath("/[locale]", "layout");
    revalidateTag("categories", "max");

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[settings] PATCH error:", error);
    return NextResponse.json(
      { message: "Failed to update settings" },
      { status: 500 }
    );
  }
}
