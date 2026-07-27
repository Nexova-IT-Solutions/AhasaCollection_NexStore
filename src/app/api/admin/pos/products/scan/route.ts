import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

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
    const barcode = searchParams.get("barcode")?.trim();

    if (!barcode || barcode.length === 0) {
      return NextResponse.json(
        { success: false, message: "Barcode/SKU parameter is required" },
        { status: 400 }
      );
    }

    // Search by SKU first (exact match), then by gift card barcode
    const product = await db.product.findFirst({
      where: {
        OR: [
          { sku: barcode },
          { sku: { equals: barcode, mode: "insensitive" } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        productImages: true,
        isActive: true,
        isEGiftCard: true,
        giftCardValue: true,
        category: { select: { name: true } },
        discount: {
          select: {
            id: true,
            name: true,
            value: true,
            type: true,
            isActive: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
    });

    if (product) {
      // Check if discount is currently active
      const now = new Date();
      let activeDiscount: typeof product.discount | null = null;
      if (
        product.discount &&
        product.discount.isActive &&
        (!product.discount.startsAt || product.discount.startsAt <= now) &&
        (!product.discount.endsAt || product.discount.endsAt >= now)
      ) {
        activeDiscount = product.discount;
      }

      // Extract first image from productImages JSON
      let image: string | null = null;
      if (product.productImages) {
        const imgs = product.productImages as any;
        if (Array.isArray(imgs) && imgs.length > 0) {
          image = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url || null;
        }
      }

      return NextResponse.json({
        success: true,
        type: "product",
        product: {
          id: product.id,
          name: product.name,
          nameAr: product.nameAr,
          sku: product.sku,
          price: product.price,
          salePrice: product.salePrice,
          stock: product.stock,
          image: image,
          isActive: product.isActive,
          categoryName: product.category?.name || null,
          discountId: activeDiscount?.id || null,
          discountName: activeDiscount?.name || null,
          discountValue: activeDiscount?.value || null,
          discountType: activeDiscount?.type || null,
          isEGiftCard: product.isEGiftCard,
          giftCardValue: product.giftCardValue ?? null,
        },
      });
    }

    // ─── Variant SKU Bypass: search JSONB productVariants for matching SKU ───
    // When a barcode matches a variant-level SKU (e.g. "SKU-M-RED"), the POS
    // should add that specific variant directly without opening a selection modal.
    const variantMatch = await db.product.findFirst({
      where: {
        isActive: true,
        productVariants: {
          path: [],
          array_contains: [{ sku: barcode }],
        },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        productImages: true,
        productVariants: true,
        isActive: true,
        isEGiftCard: true,
        giftCardValue: true,
        sizes: true,
        colors: true,
        category: { select: { name: true } },
        discount: {
          select: {
            id: true,
            name: true,
            value: true,
            type: true,
            isActive: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
    });

    if (variantMatch) {
      // Parse the JSONB to find the exact variant entry
      const variantsArr = Array.isArray(variantMatch.productVariants)
        ? (variantMatch.productVariants as Array<Record<string, unknown>>)
        : [];
      const resolvedVariant = variantsArr.find(
        (v) => typeof v.sku === "string" && v.sku.toLowerCase() === barcode.toLowerCase()
      );

      if (resolvedVariant) {
        const now = new Date();
        let activeDiscount: typeof variantMatch.discount | null = null;
        if (
          variantMatch.discount &&
          variantMatch.discount.isActive &&
          (!variantMatch.discount.startsAt || variantMatch.discount.startsAt <= now) &&
          (!variantMatch.discount.endsAt || variantMatch.discount.endsAt >= now)
        ) {
          activeDiscount = variantMatch.discount;
        }

        let image: string | null = null;
        if (variantMatch.productImages) {
          const imgs = variantMatch.productImages as any;
          if (Array.isArray(imgs) && imgs.length > 0) {
            image = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url || null;
          }
        }

        const variantSize = typeof resolvedVariant.size === "string" ? resolvedVariant.size : "";
        const variantColor = typeof resolvedVariant.color === "string" ? resolvedVariant.color : "";
        const variantStock = typeof resolvedVariant.stock === "number" ? resolvedVariant.stock : 0;
        const variantSku = typeof resolvedVariant.sku === "string" ? resolvedVariant.sku : barcode;
        const variantId =
          typeof resolvedVariant.variantId === "string"
            ? resolvedVariant.variantId
            : `${variantSize || "default"}:${variantColor || "default"}`;
        const isCustomPrice = typeof resolvedVariant.price === "number" && resolvedVariant.price !== variantMatch.price;

        return NextResponse.json({
          success: true,
          type: "product",
          product: {
            id: variantMatch.id,
            name: `${variantMatch.name} (${[variantSize, variantColor ? variantColor.split('|')[0] : ""].filter(Boolean).join(" / ")})`,
            nameAr: variantMatch.nameAr,
            sku: variantSku,
            price: typeof resolvedVariant.price === "number" ? resolvedVariant.price : variantMatch.price,
            salePrice: isCustomPrice ? null : variantMatch.salePrice,
            stock: variantStock,
            image: image,
            isActive: variantMatch.isActive,
            categoryName: variantMatch.category?.name || null,
            discountId: activeDiscount?.id || null,
            discountName: activeDiscount?.name || null,
            discountValue: activeDiscount?.value || null,
            discountType: activeDiscount?.type || null,
            isEGiftCard: variantMatch.isEGiftCard,
            giftCardValue: variantMatch.giftCardValue ?? null,
          },
          // Extra metadata so POS knows this is a resolved variant scan
          resolvedVariant: {
            variantId,
            size: variantSize,
            color: variantColor,
            stock: variantStock,
            sku: variantSku,
          },
        });
      }
    }

    // If not found as a product, check if it's a physical gift card barcode
    const giftCard = await db.giftCard.findFirst({
      where: {
        OR: [
          { barcode: barcode },
          { code: barcode },
        ],
        isActive: true,
        isPhysical: true,
      },
      select: {
        id: true,
        code: true,
        barcode: true,
        balance: true,
        initialValue: true,
        isActive: true,
        expiresAt: true,
        status: true,
      },
    });

    if (giftCard) {
      const isExpired = giftCard.expiresAt && giftCard.expiresAt < new Date();
      const isUsable = giftCard.isActive && !isExpired && giftCard.balance > 0 && giftCard.status === "AVAILABLE";

      return NextResponse.json({
        success: true,
        type: "giftcard",
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          barcode: giftCard.barcode,
          balance: giftCard.balance,
          initialValue: giftCard.initialValue,
          isUsable: isUsable,
          isExpired: !!isExpired,
          status: giftCard.status,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `No product or gift card found for barcode: ${barcode}` },
      { status: 404 }
    );
  } catch (error) {
    console.error("[POS Product Scan] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
