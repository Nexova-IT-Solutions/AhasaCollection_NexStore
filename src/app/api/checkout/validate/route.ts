import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload.items || !Array.isArray(payload.items)) {
      return NextResponse.json({ success: false, message: "Invalid payload format" }, { status: 400 });
    }

    const items: Array<{ productId: string; quantity: number }> = payload.items;

    if (items.length === 0) {
      return NextResponse.json({ valid: true }, { status: 200 }); // Empty cart is trivially valid
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);

    // Fetch products
    const dbProducts = await db.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        // Deep include to validate child components' composite stock for premium gift boxes
        itemsInside: {
          include: {
            item: true
          }
        }
      }
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const outOfStockIds: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      if (!item.productId) continue;

      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({
          error: "NOT_FOUND",
          message: `Product not found or currently unavailable`
        }, { status: 400 });
      }

      const requestedQuantity = Number(item.quantity);
      if (!requestedQuantity || requestedQuantity <= 0) continue;

      let itemValid = true;

      // 1. Direct stock check
      if (product.stock < requestedQuantity) {
        outOfStockIds.push(item.productId);
        errors.push(`Insufficient stock for ${product.name}.`);
        itemValid = false;
      }

      // 2. Deep verification for Premium Gift Boxes
      if (itemValid && product.isPremiumGiftBox && product.itemsInside && product.itemsInside.length > 0) {
        for (const childRelationship of product.itemsInside) {
          const childItem = childRelationship.item;
          const requiredChildQuantity = childRelationship.quantity * requestedQuantity;

          if (childItem.stock < requiredChildQuantity) {
            outOfStockIds.push(item.productId);
            errors.push(`Gift box "${product.name}" is unavailable because the contained item "${childItem.name}" is out of stock.`);
            break; // Stop checking other children for this specific box
          }
        }
      }
    }

    if (outOfStockIds.length > 0) {
      return NextResponse.json({
        valid: false,
        outOfStockIds,
        errors
      }, { status: 400 });
    }

    return NextResponse.json({ valid: true, outOfStockIds: [], errors: [] }, { status: 200 });
  } catch (error) {
    console.error("[checkout-validate] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
