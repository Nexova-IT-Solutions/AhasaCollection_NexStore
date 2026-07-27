import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteStyles } from "@/data/boxBuilder";
import { BoxBuilderItem, CustomBoxItem, WrappingOption, NoteStyle } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wrapId, giftMessage, noteStyle, items } = body;

    // 1. Basic validation
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Custom box must contain at least one item." },
        { status: 400 }
      );
    }

    // 2. Validate wrapping option
    let resolvedWrapping: WrappingOption | null = null;
    let wrappingPrice = 0;
    if (wrapId) {
      const dbWrap = await db.giftWrap.findUnique({
        where: { id: wrapId, isActive: true },
      });

      if (!dbWrap) {
        return NextResponse.json(
          { error: `Selected wrapping option not found or inactive: ${wrapId}` },
          { status: 400 }
        );
      }

      resolvedWrapping = {
        id: dbWrap.id,
        name: dbWrap.name,
        description: dbWrap.description || "",
        price: dbWrap.price,
        image: dbWrap.imageUrl || undefined,
        imageUrl: dbWrap.imageUrl || undefined,
      };
      wrappingPrice = dbWrap.price;
    }

    // 3. Validate noteStyle card
    let resolvedNoteStyle: NoteStyle | null = null;
    let notePrice = 0;
    if (noteStyle) {
      const matchedNote = noteStyles.find((style) => style.id === noteStyle);
      if (matchedNote) {
        resolvedNoteStyle = matchedNote;
        notePrice = matchedNote.price;
      }
    }

    // 4. Validate product items & check stock status
    const resolvedItems: CustomBoxItem[] = [];
    let itemsPriceTotal = 0;

    for (const cartItem of items) {
      const { productId, quantity, selectedSize, selectedColor, variantName } = cartItem;

      if (!productId || typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid item ID or quantity." },
          { status: 400 }
        );
      }

      const product = await db.product.findUnique({
        where: { id: productId, isActive: true, isAvailableInBuilder: true },
        include: {
          category: true,
          occasions: true,
          recipients: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found or not available in box builder: ${productId}` },
          { status: 400 }
        );
      }

      if (product.stock < quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${quantity}.`,
          },
          { status: 400 }
        );
      }

      // Validate selected size
      if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        if (!selectedSize) {
          return NextResponse.json(
            { error: `Missing size selection for product "${product.name}". Available sizes: ${product.sizes.join(", ")}` },
            { status: 400 }
          );
        }
        if (!product.sizes.includes(selectedSize)) {
          return NextResponse.json(
            { error: `Invalid size selection "${selectedSize}" for product "${product.name}". Available sizes: ${product.sizes.join(", ")}` },
            { status: 400 }
          );
        }
      }

      // Validate selected color
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        if (!selectedColor) {
          return NextResponse.json(
            { error: `Missing color selection for product "${product.name}". Available colors: ${product.colors.join(", ")}` },
            { status: 400 }
          );
        }
        if (!product.colors.includes(selectedColor)) {
          return NextResponse.json(
            { error: `Invalid color selection "${selectedColor}" for product "${product.name}". Available colors: ${product.colors.join(", ")}` },
            { status: 400 }
          );
        }
      }

      // Safe image extraction matching the builder API logic
      let imagesList: string[] = [];
      if (Array.isArray(product.productImages)) {
        imagesList = (product.productImages as any[])
          .map((img) => (typeof img === "string" ? img : img?.url || img?.image || img))
          .filter(Boolean);
      } else if (typeof product.productImages === "string") {
        try {
          const parsed = JSON.parse(product.productImages);
          if (Array.isArray(parsed)) {
            imagesList = parsed
              .map((img) => (typeof img === "string" ? img : img?.url || img?.image || img))
              .filter(Boolean);
          }
        } catch {
          if (product.productImages.trim().length > 0) {
            imagesList = [product.productImages.trim()];
          }
        }
      }

      const builderItem: BoxBuilderItem = {
        id: product.id,
        name: product.name,
        slug: product.sku || product.id,
        description: product.description || "",
        shortDescription: product.shortDescription || product.description || "",
        price: product.price,
        images: imagesList,
        categoryId: product.categoryId || "",
        category: product.category?.slug || "addon",
        occasionIds: product.occasions.map((o) => o.id),
        occasions: product.occasions.map((o) => o.slug),
        recipients: product.recipients.map((r) => r.slug),
        tags: [],
        inStock: product.stock > 0,
        capacityUnits: product.builderCapacityUnits || 1,
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
        isPremiumGiftBox: product.isPremiumGiftBox,
      };

      resolvedItems.push({
        item: builderItem,
        quantity,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
        variantName: variantName || (selectedSize || selectedColor ? `${selectedSize || ''} ${selectedColor ? `/ ${selectedColor.split('|')[0]}` : ''}`.trim() : undefined),
      });

      itemsPriceTotal += product.price * quantity;
    }

    // 5. Compute total pricing server-side
    const subtotal = itemsPriceTotal + wrappingPrice + notePrice;

    return NextResponse.json({
      success: true,
      subtotal,
      items: resolvedItems,
      wrapping: resolvedWrapping,
      noteStyle: resolvedNoteStyle,
      message: giftMessage || "",
    });
  } catch (error) {
    console.error("[ADD_CUSTOM_BOX_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
