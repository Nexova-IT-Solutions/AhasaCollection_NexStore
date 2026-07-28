import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Authorize: DEV_ADMIN, SUPER_ADMIN, or catalog.stock_admin / catalog.manage_inventory privilege
  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "catalog.stock_admin") ||
    hasPermission(session, "catalog.manage_inventory");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { productId, quantity, reason } = await req.json();

    if (!productId || !quantity || quantity <= 0 || !reason) {
      return NextResponse.json(
        { message: "Invalid payload parameters" },
        { status: 400 }
      );
    }

    // Fetch the product details
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { message: `Insufficient stock to remove. Available: ${product.stock}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    // Process inside a transaction
    await db.$transaction(async (tx) => {
      // 1. Deduct stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      // 2. Log the stock removal
      await tx.stockTransferLog.create({
        data: {
          productId,
          productName: product.name,
          productSku: product.sku,
          sourceOutletId: product.outletId,
          targetOutletId: null, // denotes removal from system
          quantity,
          reason: `Stock Removed: ${reason}`,
          performedById: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Stock removed successfully" });
  } catch (error: any) {
    console.error("[Inventory Adjust Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
