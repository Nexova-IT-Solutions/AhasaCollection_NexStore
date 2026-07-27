import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

/**
 * Search products for the POS grid by name, SKU, or category.
 * GET /api/admin/pos/products/search?q=...&category=...&page=1&limit=20
 */
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
    const query = searchParams.get("q")?.trim() || "";
    const categoryId = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      stock: { gt: 0 },
    };

    if (query.length > 0) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, totalCount, categories] = await Promise.all([
      db.product.findMany({
        where,
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
          sizes: true,
          colors: true,
          isActive: true,
          isEGiftCard: true,
          giftCardValue: true,
          category: { select: { id: true, name: true } },
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
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
      db.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const now = new Date();
    const mapped = products.map((p) => {
      let image: string | null = null;
      if (p.productImages) {
        const imgs = p.productImages as any;
        if (Array.isArray(imgs) && imgs.length > 0) {
          image = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url || null;
        }
      }

      let activeDiscount: typeof p.discount | null = null;
      if (
        p.discount &&
        p.discount.isActive &&
        (!p.discount.startsAt || p.discount.startsAt <= now) &&
        (!p.discount.endsAt || p.discount.endsAt >= now)
      ) {
        activeDiscount = p.discount;
      }

      return {
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        sku: p.sku,
        price: p.price,
        salePrice: p.salePrice,
        stock: p.stock,
        image,
        categoryName: p.category?.name || null,
        categoryId: p.category?.id || null,
        discountId: activeDiscount?.id || null,
        discountName: activeDiscount?.name || null,
        discountValue: activeDiscount?.value || null,
        discountType: activeDiscount?.type || null,
        isEGiftCard: p.isEGiftCard,
        giftCardValue: p.giftCardValue ?? null,
        sizes: p.sizes ?? [],
        colors: p.colors ?? [],
        productVariants: p.productVariants ?? [],
      };
    });

    return NextResponse.json({
      success: true,
      products: mapped,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      categories,
    });
  } catch (error) {
    console.error("[POS Product Search] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
