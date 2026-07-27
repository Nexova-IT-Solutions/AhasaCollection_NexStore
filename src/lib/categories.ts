import { db } from "@/lib/db";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getStoreConfig } from "@/lib/store-config";

interface GetCategoriesOptions {
  hideEmpty?: boolean;
  includeChildren?: boolean;
  isForBuilder?: boolean;
}

const fetchCategoriesDb = async (
  hideEmpty: boolean,
  includeChildren: boolean,
  isForBuilder: boolean
) => {
  const productCondition: any = {
    isActive: true,
  };

  if (isForBuilder) {
    productCondition.isAvailableInBuilder = true;
  }

  if (hideEmpty) {
    productCondition.stock = { gt: 0 };
  }

  const hasMatchingProducts = {
    some: productCondition,
  };

  // We should filter categories that actually contain products matching the criteria
  // If it's for builder or we need to hide empty categories, we filter root categories
  const shouldFilter = isForBuilder || hideEmpty;

  const visibilityFilter = shouldFilter
    ? {
        OR: [
          { products: hasMatchingProducts },
          {
            subCategories: {
              some: {
                products: hasMatchingProducts,
              },
            },
          },
        ],
      }
    : {};

  return db.category.findMany({
    where: {
      isActive: true,
      parentId: null,
      ...visibilityFilter,
    },
    include: {
      subCategories: {
        where: {
          isActive: true,
          ...(shouldFilter ? { products: hasMatchingProducts } : {}),
        },
        orderBy: { name: "asc" },
      },
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const getVisibleCategoriesCached = unstable_cache(
  async (hideEmpty: boolean, includeChildren: boolean, isForBuilder: boolean) => {
    return fetchCategoriesDb(hideEmpty, includeChildren, isForBuilder);
  },
  ["storefront-categories-hierarchy"],
  { revalidate: 3600, tags: ["categories"] }
);

/**
 * Fetch visible categories for storefront use.
 * This is the single source of truth for categories.
 * Sorted A-Z at both root and sub-category levels.
 */
export const getVisibleCategories = async (options: GetCategoriesOptions = {}) => {
  const { hideEmpty = false, includeChildren = true, isForBuilder = false } = options;
  return getVisibleCategoriesCached(hideEmpty, includeChildren, isForBuilder);
};

/**
 * React cache version for per-request usage if needed
 */
export const getCachedCategories = cache(async () => {
  const config = await getStoreConfig();
  return getVisibleCategories({
    hideEmpty: config.hideEmptyCategories,
    includeChildren: true,
    isForBuilder: false,
  });
});

/**
 * Fetch visible sub-categories of a parent category.
 * Respects store settings and builder-ready requirements.
 */
export async function getVisibleSubCategories(
  parentId: string,
  hideEmpty: boolean,
  isForBuilder: boolean = false
) {
  const productCondition: any = {
    isActive: true,
  };

  if (isForBuilder) {
    productCondition.isAvailableInBuilder = true;
  }

  if (hideEmpty) {
    productCondition.stock = { gt: 0 };
  }

  const hasMatchingProducts = {
    some: productCondition,
  };

  const shouldFilter = isForBuilder || hideEmpty;

  return db.category.findMany({
    where: {
      parentId,
      isActive: true,
      ...(shouldFilter ? { products: hasMatchingProducts } : {}),
    },
    orderBy: { name: "asc" },
  });
}
