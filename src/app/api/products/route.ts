import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db, getMoodClient } from "@/lib/db";
import { getStoreConfig } from "@/lib/store-config";
import { isGiftBoxEffectivelyOutOfStock } from "@/lib/gift-box-stock";

export async function GET(req: Request) {
  try {
    const moodClient = getMoodClient();
    const { searchParams } = new URL(req.url);
    const now = new Date();

    const categoriesParam = searchParams.get("categories")?.trim();
    const categoryIdsFromKeys = searchParams.getAll("categoryId");
    const categoryFromSingleKey = searchParams.get("category")?.trim();
    
    let categoryIds: string[] = [];
    
    if (categoriesParam) {
      categoryIds.push(...categoriesParam.split(",").map(id => id.trim()));
    }
    
    if (categoryIdsFromKeys.length > 0) {
      categoryIdsFromKeys.forEach(val => {
        categoryIds.push(...val.split(",").map(id => id.trim()));
      });
    }
    
    if (categoryFromSingleKey) {
      categoryIds.push(...categoryFromSingleKey.split(",").map(id => id.trim()));
    }

    categoryIds = [...new Set(categoryIds.filter(Boolean))];

    const occasion = searchParams.get("occasion")?.trim();
    const mood = searchParams.get("mood")?.trim();
    const q = searchParams.get("q")?.trim();
    const priceMinParam = searchParams.get("price_min");
    const priceMaxParam = searchParams.get("price_max");

    const activeDiscountWhere = {
      isActive: true,
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    };

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      NOT: {
        productImages: {
          equals: [],
        },
      },
    };
    (where as any).OR = [{ discountId: null }, { discount: { is: activeDiscountWhere } }];

    if (categoryIds.length > 0) {
      where.categoryId = { in: categoryIds };
    }

    if (occasion) {
      where.occasions = { some: { slug: occasion } };
    }

    if (mood && moodClient) {
      (where as any).moods = {
        some: {
          mood: {
            slug: mood,
          },
        },
      };
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    const priceMin = priceMinParam ? Number(priceMinParam) : undefined;
    const priceMax = priceMaxParam ? Number(priceMaxParam) : undefined;

    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {
        ...(priceMin !== undefined ? { gte: priceMin } : {}),
        ...(priceMax !== undefined ? { lte: priceMax } : {}),
      };
    }

    const products = await db.product.findMany({
      where,
      include: {
        discount: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        occasions: {
          select: { id: true, name: true, slug: true },
        },
        ...(moodClient
          ? {
              moods: {
                select: {
                  mood: {
                    select: { id: true, name: true, slug: true, icon: true },
                  },
                },
              },
            }
          : {}),
        itemsInside: {
          select: {
            quantity: true,
            item: {
              select: { stock: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const storeSettings = await getStoreConfig();
    let displayProducts = products;

    if (storeSettings.hideOutOfStockProducts) {
      displayProducts = products.filter((product) => {
        // Direct stock check
        if (product.stock <= 0) return false;

        // Composite check for gift boxes
        const hasUnavailableChild = isGiftBoxEffectivelyOutOfStock(product.itemsInside);
        return !hasUnavailableChild;
      });
    }

    return NextResponse.json(displayProducts);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
