import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CartItem } from "@/types";

function parseCartItems(raw: unknown): CartItem[] {
  try {
    if (typeof raw === "string") return JSON.parse(raw) || [];
    if (Array.isArray(raw)) return raw;
    return [];
  } catch {
    return [];
  }
}

/**
 * Validates and synchronizes cart items against the database.
 * Fetches live pricing, active promotions, and stock levels.
 */
async function validateAndSyncCartItems(items: CartItem[]): Promise<CartItem[]> {
  const synced: CartItem[] = [];

  for (const item of items) {
    try {
      if (item.type === "product") {
        const productId = item.product?.id || item.id;
        const product = await db.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            isActive: true,
            stock: true,
            productVariants: true,
            showInDiscountSection: true,
          },
        });

        if (!product || !product.isActive) {
          // Product is inactive or deleted, skip it
          continue;
        }

        let effectivePrice =
          product.salePrice != null && product.salePrice < product.price
            ? product.salePrice
            : product.price;
        let basePrice = product.price;

        let variant = item.selectedVariant;
        if (item.selectedVariant?.id && Array.isArray(product.productVariants)) {
          const dbVariant = (product.productVariants as any[]).find(
            (v) => v.variantId === item.selectedVariant?.id || v.id === item.selectedVariant?.id
          );
          if (dbVariant) {
            if (typeof dbVariant.price === "number") {
              effectivePrice = dbVariant.price;
              basePrice = dbVariant.price;
            }
            variant = {
              ...item.selectedVariant,
              price: effectivePrice,
              originalPrice: basePrice,
              inStock: dbVariant.stock > 0,
            };
          }
        }

        const originalPrice = basePrice > effectivePrice ? basePrice : undefined;

        // Keep nested product object consistent
        const updatedProduct = item.product
          ? {
              ...item.product,
              price: basePrice,
              salePrice: product.salePrice ?? undefined,
              inStock: product.stock > 0,
            }
          : undefined;

        synced.push({
          ...item,
          product: updatedProduct,
          price: effectivePrice,
          originalPrice,
          subtotal: effectivePrice * item.quantity,
          isOutOfStock: product.stock < item.quantity,
          selectedVariant: variant,
        });
      } else if (item.type === "giftbox") {
        const giftBoxId = item.giftBox?.id || item.id;
        const giftBox = await db.product.findUnique({
          where: { id: giftBoxId },
          select: {
            id: true,
            name: true,
            price: true,
            salePrice: true,
            isActive: true,
            stock: true,
          },
        });

        if (!giftBox || !giftBox.isActive) {
          continue;
        }

        const effectivePrice =
          giftBox.salePrice != null && giftBox.salePrice < giftBox.price
            ? giftBox.salePrice
            : giftBox.price;
        const originalPrice = giftBox.price > effectivePrice ? giftBox.price : undefined;

        const updatedGiftBox = item.giftBox
          ? {
              ...item.giftBox,
              price: giftBox.price,
              salePrice: giftBox.salePrice ?? undefined,
            }
          : undefined;

        synced.push({
          ...item,
          giftBox: updatedGiftBox,
          price: effectivePrice,
          originalPrice,
          subtotal: effectivePrice * item.quantity,
          isOutOfStock: giftBox.stock < item.quantity,
        });
      } else if (item.type === "custombox") {
        if (item.customBox) {
          let itemsTotal = 0;
          const updatedBoxItems: any[] = [];

          for (const ci of item.customBox.items) {
            const product = await db.product.findUnique({
              where: { id: ci.item.id },
              select: { price: true, stock: true },
            });
            const activePrice = product ? product.price : ci.item.price;
            updatedBoxItems.push({
              ...ci,
              item: {
                ...ci.item,
                price: activePrice,
                inStock: product ? product.stock > 0 : ci.item.inStock,
              },
            });
            itemsTotal += activePrice * ci.quantity;
          }

          // Fetch wrapping option price from DB
          let wrappingPrice = item.customBox.wrapping?.price || 0;
          if (item.customBox.wrapping?.id) {
            const dbWrap = await db.giftWrap.findUnique({
              where: { id: item.customBox.wrapping.id },
              select: { price: true },
            });
            if (dbWrap) {
              wrappingPrice = dbWrap.price;
            }
          }

          const boxBasePrice = item.customBox.boxType.basePrice || 0;
          const notePrice = item.customBox.noteStyle?.price || 0;

          const singleBoxPrice = boxBasePrice + itemsTotal + wrappingPrice + notePrice;
          const totalSubtotal = singleBoxPrice * item.quantity;

          synced.push({
            ...item,
            customBox: {
              ...item.customBox,
              items: updatedBoxItems,
              wrapping: item.customBox.wrapping
                ? { ...item.customBox.wrapping, price: wrappingPrice }
                : undefined,
            },
            price: singleBoxPrice,
            originalPrice: singleBoxPrice,
            subtotal: totalSubtotal,
          });
        } else {
          synced.push(item);
        }
      } else if (item.type === "giftcard") {
        const initialValue = item.virtualGiftCard?.initialValue || 0;
        synced.push({
          ...item,
          price: initialValue,
          subtotal: initialValue * item.quantity,
        });
      } else {
        synced.push(item);
      }
    } catch (err) {
      console.error(`Error validating item in validateAndSyncCartItems:`, err);
      synced.push(item);
    }
  }

  return synced;
}

/**
 * POST /api/cart/merge
 *
 * Strategy:
 * 1. If overwrite is true: replace database cart items with client items directly.
 * 2. If overwrite is false: merge guest items into DB cart (sum quantities for duplicates).
 * 3. Validate all items against the DB to ensure live pricing and stock levels.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const guestItems: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const overwrite = body.overwrite === true;

    // Server-side corruption guard
    const corrupted = guestItems.some((item) => item.quantity > 100);
    if (corrupted) {
      return NextResponse.json({
        message: "Corrupted items detected, discarding request",
        merged: false,
      });
    }

    // Get or create the user's cart
    let cart = await db.cart.findUnique({ where: { userId: session.user.id } });

    if (!cart) {
      // First login or no DB cart — create new cart with validated guest items
      const validatedItems = await validateAndSyncCartItems(guestItems);
      cart = await db.cart.create({
        data: {
          userId: session.user.id,
          items: JSON.stringify(validatedItems),
        },
      });
      return NextResponse.json({
        message: "Cart created with guest items",
        items: validatedItems,
        merged: true,
      });
    }

    let finalItems: CartItem[];

    if (overwrite) {
      finalItems = await validateAndSyncCartItems(guestItems);
    } else {
      const dbItems = parseCartItems(cart.items);
      const mergedMap = new Map<string, CartItem>();

      // Load existing DB items
      for (const item of dbItems) {
        mergedMap.set(item.id, item);
      }

      // Merge new guest items (accumulating quantity if already present)
      for (const guestItem of guestItems) {
        const existing = mergedMap.get(guestItem.id);
        if (existing) {
          existing.quantity += guestItem.quantity;
        } else {
          mergedMap.set(guestItem.id, guestItem);
        }
      }

      const mergedItems = Array.from(mergedMap.values());
      finalItems = await validateAndSyncCartItems(mergedItems);
    }

    // Persist to database
    const updatedCart = await db.cart.update({
      where: { id: cart.id },
      data: { items: JSON.stringify(finalItems) },
    });

    const returnedItems = parseCartItems(updatedCart.items);

    return NextResponse.json({
      message: overwrite ? "Cart synchronized successfully" : "Cart merged successfully",
      items: returnedItems,
      merged: true,
    });
  } catch (error) {
    console.error("[CART_MERGE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/cart/merge?itemId=xxx
 *
 * Persists a cart item removal to the database for authenticated users.
 * This ensures removed items don't reappear on next login.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const cart = await db.cart.findUnique({ where: { userId: session.user.id } });

    if (!cart) {
      // No cart to update — treat as success
      return NextResponse.json({ message: "Item removed", success: true });
    }

    const currentItems = parseCartItems(cart.items);
    const filteredItems = currentItems.filter((item) => item.id !== itemId);

    await db.cart.update({
      where: { id: cart.id },
      data: { items: JSON.stringify(filteredItems) },
    });

    return NextResponse.json({ message: "Item removed from DB cart", success: true });
  } catch (error) {
    console.error("[CART_REMOVE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
