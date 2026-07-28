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

  // Authorize: DEV_ADMIN, SUPER_ADMIN, or catalog.stock_admin privilege
  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "catalog.stock_admin");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { productId, targetOutletId, quantity, reason } = await req.json();

    if (!productId || !targetOutletId || !quantity || quantity <= 0 || !reason) {
      return NextResponse.json(
        { message: "Invalid payload parameters" },
        { status: 400 }
      );
    }

    // Fetch the source product details
    const sourceProduct = await db.product.findUnique({
      where: { id: productId },
    });

    if (!sourceProduct) {
      return NextResponse.json({ message: "Source product not found" }, { status: 404 });
    }

    if (sourceProduct.stock < quantity) {
      return NextResponse.json(
        { message: `Insufficient stock. Available: ${sourceProduct.stock}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    if (sourceProduct.outletId === targetOutletId) {
      return NextResponse.json(
        { message: "Source and target outlets cannot be the same" },
        { status: 400 }
      );
    }

    // Process inside a transaction
    await db.$transaction(async (tx) => {
      // 1. Deduct stock from source product
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      // 2. Find target product with same SKU/Details at destination outlet
      let targetProduct = await tx.product.findFirst({
        where: {
          sku: sourceProduct.sku ? sourceProduct.sku : undefined,
          name: sourceProduct.sku ? undefined : sourceProduct.name,
          outletId: targetOutletId,
        },
      });

      if (targetProduct) {
        // Increment stock
        await tx.product.update({
          where: { id: targetProduct.id },
          data: { stock: { increment: quantity } },
        });
      } else {
        // Create new row copying details
        await tx.product.create({
          data: {
            name: sourceProduct.name,
            nameAr: sourceProduct.nameAr,
            sku: sourceProduct.sku,
            description: sourceProduct.description,
            shortDescription: sourceProduct.shortDescription,
            price: sourceProduct.price,
            salePrice: sourceProduct.salePrice,
            stock: quantity,
            categoryId: sourceProduct.categoryId,
            sizes: sourceProduct.sizes,
            colors: sourceProduct.colors,
            productImages: sourceProduct.productImages || [],
            productVariants: sourceProduct.productVariants || [],
            isEGiftCard: sourceProduct.isEGiftCard,
            giftCardValue: sourceProduct.giftCardValue,
            isActive: true,
            outletId: targetOutletId,
            repositoryId: sourceProduct.repositoryId,
            isNewArrival: sourceProduct.isNewArrival,
            isTrending: sourceProduct.isTrending,
            isTopRated: sourceProduct.isTopRated,
            isBestSeller: sourceProduct.isBestSeller,
            showInDiscountSection: sourceProduct.showInDiscountSection,
            showInChocolateSection: sourceProduct.showInChocolateSection,
            showInSoftToysSection: sourceProduct.showInSoftToysSection,
            isPremiumGiftBox: sourceProduct.isPremiumGiftBox,
            isSpecialTouch: sourceProduct.isSpecialTouch,
            isAvailableInBuilder: sourceProduct.isAvailableInBuilder,
            specialTouchOrder: sourceProduct.specialTouchOrder,
            costPrice: sourceProduct.costPrice,
            supplierId: sourceProduct.supplierId,
            discountId: sourceProduct.discountId,
            builderCapacityUnits: sourceProduct.builderCapacityUnits,
            averageRating: sourceProduct.averageRating,
            reviewCount: sourceProduct.reviewCount,
          },
        });
      }

      // 3. Log the transfer for audit trail
      await tx.stockTransferLog.create({
        data: {
          productId,
          productName: sourceProduct.name,
          productSku: sourceProduct.sku,
          sourceOutletId: sourceProduct.outletId,
          targetOutletId,
          quantity,
          reason,
          performedById: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Stock transferred successfully" });
  } catch (error: any) {
    console.error("[Inventory Transfer Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
