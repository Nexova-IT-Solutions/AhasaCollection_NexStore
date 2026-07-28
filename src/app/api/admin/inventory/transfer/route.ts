import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath, revalidateTag } from "next/cache";

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

    // ── Resolve target location: is it a Repository or an Outlet? ──
    const targetRepo = await db.repository.findUnique({ where: { id: targetOutletId } });
    const targetOutlet = targetRepo ? null : await db.outlet.findUnique({ where: { id: targetOutletId } });

    const targetIsRepo = !!targetRepo;
    const resolvedRepoId  = targetIsRepo ? targetOutletId : null;
    const resolvedOutletId = targetIsRepo ? null : (targetOutlet ? targetOutletId : null);

    // Process inside a transaction
    await db.$transaction(async (tx) => {
      // 1. Deduct stock from source product
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      // 2. Find existing product at the destination (match by SKU or name + correct placement field)
      let targetProduct = await tx.product.findFirst({
        where: {
          sku: sourceProduct.sku ? sourceProduct.sku : undefined,
          name: sourceProduct.sku ? undefined : sourceProduct.name,
          ...(targetIsRepo
            ? { repositoryId: resolvedRepoId }
            : { outletId: resolvedOutletId }),
        },
      });

      if (targetProduct) {
        // Update existing — increment stock and correct placement fields
        await tx.product.update({
          where: { id: targetProduct.id },
          data: {
            stock: { increment: quantity },
            repositoryId: resolvedRepoId,
            outletId: resolvedOutletId,
          },
        });
      } else {
        // Create new product copy at destination with correct placement
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
            // ── Correct placement: set exactly one of repo/outlet, clear the other ──
            repositoryId: resolvedRepoId,
            outletId: resolvedOutletId,
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
      // sourceOutletId records the actual source location (repo or outlet)
      const sourceLocationId = sourceProduct.outletId || sourceProduct.repositoryId;
      await tx.stockTransferLog.create({
        data: {
          productId,
          productName: sourceProduct.name,
          productSku: sourceProduct.sku,
          sourceOutletId: sourceLocationId,
          targetOutletId,
          quantity,
          reason,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/pos");
    revalidateTag("admin-products");

    return NextResponse.json({ success: true, message: "Stock transferred successfully" });
  } catch (error: any) {
    console.error("[Inventory Transfer Error]:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
