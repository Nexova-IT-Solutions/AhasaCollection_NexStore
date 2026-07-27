import { Prisma } from "@prisma/client";
import { db, getMoodClient } from "@/lib/db";
import { getStoreConfig } from "@/lib/store-config";
import { isGiftBoxEffectivelyOutOfStock } from "@/lib/gift-box-stock";
import { getVisibleCategories } from "@/lib/categories";

export type CategoriesFilters = {
  categories?: string[];
  occasion?: string;
  mood?: string;
  recipient?: string;
  filter?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
  view?: "grid" | "list";
  limit?: number;
  page?: number;
  byob?: boolean;
};

export const getPriceRange = async () => {
  try {
    const result = await db.product.aggregate({
      where: { isActive: true },
      _min: { price: true },
      _max: { price: true },
    });
    
    return {
      min: result._min.price ?? 0,
      max: result._max.price ?? 50000,
    };
  } catch (error) {
    console.error("Error in getPriceRange:", error);
    return { min: 0, max: 50000 };
  }
};

export const getFilterMetadata = async () => {
  const moodClient = getMoodClient();
  const config = await getStoreConfig();
  const hideEmpty = config.hideEmptyCategories;

  try {
    const [rootCategories, occasions, recipients, moods] = await Promise.all([
      getVisibleCategories({
        hideEmpty,
        includeChildren: true
      }),
      db.occasion.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, description: true, image: true },
        orderBy: { name: "asc" },
      }),
      db.recipient.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      moodClient
        ? moodClient.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true, icon: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const categories: any[] = [];
    rootCategories.forEach(root => {
      categories.push({
        id: root.id,
        name: root.name,
        slug: root.slug,
        parentId: null
      });
      
      if (root.subCategories) {
        root.subCategories.forEach((sub: any) => {
          categories.push({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            parentId: root.id
          });
        });
      }
    });

    return { categories, occasions, recipients, moods };
  } catch (error) {
    console.error("Error in getFilterMetadata:", error);
    return { categories: [], occasions: [], recipients: [], moods: [] };
  }
};

export const getFilteredProducts = async (
  categories: string[] = [],
  occasion?: string,
  mood?: string,
  recipient?: string,
  priceMin?: number,
  priceMax?: number,
  inStock?: boolean,
  sort: CategoriesFilters["sort"] = "newest",
  limit = 20, // Increased default limit to 20 as requested
  filter?: string,
  page = 1
) => {
  const ITEMS_PER_PAGE = limit;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const moodClient = getMoodClient();
  const now = new Date();
  const storeConfig = await getStoreConfig();

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

  // Base where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    // Safely handle image filtering - only hide if explicitly empty array
    NOT: {
      productImages: {
        equals: [],
      },
    },
  };

  // Add stock filter to DB query if enabled in config or requested by user
  if (storeConfig.hideOutOfStockProducts || inStock) {
    where.stock = { gt: 0 };
  }

  // Handle Category Filtering
  if (categories && categories.length > 0) {
    const allCategories = await db.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, parentId: true },
    });

    // Resolve slugs or IDs safely via environment-agnostic lookups (ID or slug)
    const resolvedIds = categories.flatMap((c) => {
      const found = allCategories.find((cat) => cat.id === c || cat.slug === c);
      return found ? [found.id] : [];
    });

    const collectDescendantIds = (selectedId: string, depth = 0): string[] => {
      if (depth > 10) return [];
      const children = allCategories
        .filter((cat) => cat.parentId === selectedId)
        .map((cat) => cat.id);
      const nested = children.flatMap((childId) => collectDescendantIds(childId, depth + 1));
      return [selectedId, ...children, ...nested];
    };

    const finalCategoryIds = [...new Set(resolvedIds.flatMap((id) => collectDescendantIds(id)))];
    where.categoryId = { in: finalCategoryIds };
  }

  // Handle Occasion/Mood
  if (occasion) {
    where.occasions = { some: { slug: occasion } };
  }
  if (recipient) {
    where.recipients = { some: { slug: recipient } };
  }
  if (mood && moodClient) {
    (where as any).moods = { some: { mood: { slug: mood } } };
  }

  // Handle Quick Filters
  if (filter === "new-arrivals") {
    where.isNewArrival = true;
  } else if (filter === "trending") {
    where.isTrending = true;
  } else if (filter === "premium-boxes") {
    where.isPremiumGiftBox = true;
  } else if (filter === "chocolates") {
    // OR logic for chocolates section or category
    where.OR = [
      { showInChocolateSection: true },
      { category: { slug: "chocolates" } }
    ];
  } else if (filter === "discounted") {
    where.discountId = { not: null };
    where.discount = { is: activeDiscountWhere };
  } else if (filter === "soft-toys") {
    where.OR = [
      { showInSoftToysSection: true },
      { category: { slug: "soft-toys" } }
    ];
  }

  // Handle Price Range
  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {
      ...(priceMin !== undefined ? { gte: priceMin } : {}),
      ...(priceMax !== undefined ? { lte: priceMax } : {}),
    };
  }

  // Sort Order
  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    if (sort === "price-asc") return { price: "asc" };
    if (sort === "price-desc") return { price: "desc" };
    if (sort === "name-asc") return { name: "asc" };
    return { createdAt: "desc" };
  })();

  // DEBUG LOGGING
  console.log("=== CATEGORIES PAGE DEBUG ===", {
    categoryIds: categories,
    filter,
    page,
    limit,
    where: JSON.stringify(where, null, 2),
  });

  const [total, items] = await db.$transaction([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        occasions: { select: { id: true, name: true, slug: true } },
        ...(moodClient ? { moods: { select: { mood: { select: { id: true, name: true, slug: true, icon: true } } } } } : {}),
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { id: true, name: true, stock: true } },
          },
        },
      },
      orderBy,
      skip,
      take: ITEMS_PER_PAGE,
    }),
  ]);

  // Final memory filter for gift box availability
  let displayItems = items;
  if (storeConfig.hideOutOfStockProducts || inStock) {
    displayItems = items.filter((product: any) => {
      if (product.stock <= 0) return false;
      return !isGiftBoxEffectivelyOutOfStock(product.itemsInside);
    });
  }

  console.log("=== RESULT COUNT ===", { dbCount: items.length, totalCount: total, finalDisplayCount: displayItems.length });

  return {
    items: displayItems,
    total,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    currentPage: page,
  };
};
