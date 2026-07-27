import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const results = await Promise.all(
      items.map(async (item: { cartItemId?: string; id: string; variantId?: string; type: "product" | "giftbox" | "custombox" | "giftcard" }) => {
        if (item.type === "product") {
          const product = await db.product.findUnique({
            where: { id: item.id },
            select: { price: true, salePrice: true, isActive: true, stock: true, productVariants: true }
          });
          if (!product) {
            return { cartItemId: item.cartItemId, id: item.id, type: "product", currentPrice: 0, isAvailable: false };
          }
          
          let effectivePrice = product.salePrice != null && product.salePrice < product.price
            ? product.salePrice
            : product.price;
          let basePrice = product.price;
          let salePrice = product.salePrice ?? null;
          let isAvailable = product.isActive && product.stock > 0;

          if (item.variantId && Array.isArray(product.productVariants)) {
            const variant = (product.productVariants as any[]).find(v => v.variantId === item.variantId || v.id === item.variantId);
            if (variant) {
              if (typeof variant.price === 'number') {
                effectivePrice = variant.price;
                basePrice = variant.price;
                salePrice = null; // Overrides product-level sale price
              }
              if (variant.stock <= 0) {
                isAvailable = false;
              }
            }
          }

          return {
            cartItemId: item.cartItemId,
            id: item.id,
            type: "product",
            currentPrice: effectivePrice,
            currentBasePrice: basePrice,
            currentSalePrice: salePrice,
            isAvailable,
          };
        }

        if (item.type === "giftbox") {
          // Gift boxes are Product records with isPremiumGiftBox=true;
          // there is no separate GiftBox table in Prisma.
          const giftBox = await db.product.findUnique({
            where: { id: item.id },
            select: { price: true, salePrice: true, isActive: true, stock: true }
          });
          if (!giftBox) {
            return { id: item.id, type: "giftbox", currentPrice: 0, isAvailable: false };
          }
          const effectivePrice =
            giftBox.salePrice != null && giftBox.salePrice < giftBox.price
              ? giftBox.salePrice
              : giftBox.price;
          return {
            cartItemId: item.cartItemId,
            id: item.id,
            type: "giftbox",
            currentPrice: effectivePrice,
            currentBasePrice: giftBox.price,
            currentSalePrice: giftBox.salePrice ?? null,
            isAvailable: giftBox.isActive,
          };
        }

        if (item.type === "custombox") {
           return { cartItemId: item.cartItemId, id: item.id, type: "custombox", isAvailable: true };
        }

        if (item.type === "giftcard" || (item.id && item.id.startsWith("giftcard-"))) {
          return { cartItemId: item.cartItemId, id: item.id, type: "giftcard", isAvailable: true };
        }

        return { cartItemId: item.cartItemId, id: item.id, isAvailable: false };
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Cart validation error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
