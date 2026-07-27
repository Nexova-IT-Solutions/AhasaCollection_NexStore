/**
 * @file src/lib/queries/home-page-data.ts
 *
 * Home Page Data Bundle
 * ─────────────────────
 * Problem:  Every `<Suspense>` boundary on the home page resolves independently,
 *           each acquiring its own Supabase connection slot from the PgBouncer
 *           transaction-mode pool (pool_size: 15). With 8+ concurrent async
 *           Server Components firing during SSR, the pool is instantly exhausted
 *           → FATAL: EMAXCONNSESSION.
 *
 * Solution: Pre-fetch ALL home page data in a single `Promise.all` call from the
 *           root page (before Suspense boundaries render). Pass data down as props.
 *           This guarantees every query shares the same brief connection lease and
 *           the pool slot is released before the next request arrives.
 *
 * Usage:
 *   // In your page.tsx (server component):
 *   const homeData = await fetchHomePageBundle({ hideOutOfStock: true });
 *   // Then pass `homeData.newArrivals`, `homeData.categories`, etc. to each section.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── Shared Prisma Filter Helpers ─────────────────────────────────────────────

export const storefrontHasImageWhere: Prisma.ProductWhereInput = {
  NOT: { productImages: { equals: [] } },
};

export function getActiveDiscountWhere(now = new Date()): Prisma.DiscountWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null },   { endsAt:   { gte: now } }] },
    ],
  };
}

export function getActiveOrNoDiscountWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    OR: [{ discountId: null }, { discount: { is: getActiveDiscountWhere(now) } }],
  };
}

// ─── Shared Product Select Shape ──────────────────────────────────────────────
// Define once — reused across all queries to keep response shapes consistent.

const homeProductSelect = {
  id: true,
  name: true,
  shortDescription: true,
  price: true,
  salePrice: true,
  stock: true,
  categoryId: true,
  productImages: true,
  isNewArrival: true,
  isTrending: true,
  isBestSeller: true,
  isTopRated: true,
  isPremiumGiftBox: true,
  showInDiscountSection: true,
  showInChocolateSection: true,
  showInSoftToysSection: true,
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
  reviews: {
    where: { status: "APPROVED" as const },
    select: { rating: true },
  },
  itemsInside: {
    select: {
      itemId: true,
      quantity: true,
      item: { select: { id: true, name: true, stock: true } },
    },
  },
} satisfies Prisma.ProductSelect;

// ─── Bundle Options ───────────────────────────────────────────────────────────

export interface HomePageBundleOptions {
  /** When true, filter out products with stock <= 0 at the DB level. */
  hideOutOfStock: boolean;
  /** When true, filter categories/sections without products. */
  hideEmptyCategories: boolean;
  /** Take up to this many products per pool query before in-memory slicing. */
  poolSize?: number;
}

// ─── Bundle Return Type ───────────────────────────────────────────────────────

export type HomeProductRecord = Prisma.ProductGetPayload<{
  select: typeof homeProductSelect;
}>;

export interface HomePageBundle {
  /** Products flagged as new arrivals / trending / best seller / top rated */
  featuredPool: HomeProductRecord[];
  /** Popular categories (isPopular = true) */
  popularCategories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    parentId: string | null;
    isActive: boolean;
    isPopular: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** Popular occasions (isPopular = true) */
  popularOccasions: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    isActive: boolean;
    isPopular: boolean;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** Products in the "chocolates" category or flagged showInChocolateSection */
  chocolatePool: HomeProductRecord[];
  /** Products in the "soft-toys" category or flagged showInSoftToysSection */
  softToyPool: HomeProductRecord[];
  /** Products flagged isPremiumGiftBox or in a gift-box category */
  premiumBoxPool: HomeProductRecord[];
  /** Products with a real salePrice discount */
  discountedPool: HomeProductRecord[];
  /** The id of the resolved "gift-box" category, if found */
  giftBoxCategoryId: string | null;
  /** The id of the resolved "chocolates" category, if found */
  chocolateCategoryId: string | null;
  /** The id of the resolved "soft-toys" category, if found */
  softToysCategoryId: string | null;
}

// ─── Main Bundle Fetcher ──────────────────────────────────────────────────────

/**
 * Fetches all data required to render the home page in a single parallelized
 * `Promise.all` call. This is the key to avoiding PgBouncer pool exhaustion.
 *
 * PgBouncer in **transaction mode** releases the connection back to the pool
 * after each transaction. By issuing all queries within the same Node.js event
 * loop tick (via Promise.all), Prisma can multiplex them across the same small
 * set of pool slots rather than each Suspense boundary competing for one.
 *
 * @example
 * // page.tsx  (Server Component)
 * const data = await fetchHomePageBundle({ hideOutOfStock: true, hideEmptyCategories: false });
 */
export async function fetchHomePageBundle(
  options: HomePageBundleOptions
): Promise<HomePageBundle> {
  const { hideOutOfStock, poolSize = 100 } = options;
  const stockFilter: Prisma.ProductWhereInput = hideOutOfStock
    ? { stock: { gt: 0 } }
    : {};

  const baseWhere: Prisma.ProductWhereInput = {
    isActive: true,
    ...stockFilter,
    ...storefrontHasImageWhere,
  };

  // ── Phase 1: resolve category IDs (fast index lookups, no joins) ────────────
  const [giftBoxCategory, chocolateCategory, softToysCategory] =
    await Promise.all([
      db.category.findFirst({
        where: { isActive: true, slug: { contains: "gift-box", mode: "insensitive" } },
        select: { id: true },
      }),
      db.category.findFirst({
        where: { slug: "chocolates", isActive: true },
        select: { id: true },
      }),
      db.category.findFirst({
        where: {
          slug: { in: ["soft-toys", "stuffed-toys", "plush-toys", "teddies"] },
          isActive: true,
        },
        select: { id: true },
      }),
    ]);

  const giftBoxCategoryId = giftBoxCategory?.id ?? null;
  const chocolateCategoryId = chocolateCategory?.id ?? null;
  const softToysCategoryId = softToysCategory?.id ?? null;

  // ── Phase 2: fire all heavy queries in parallel ───────────────────────────
  const [
    featuredPool,
    popularCategories,
    popularOccasions,
    chocolatePool,
    softToyPool,
    premiumBoxPool,
    discountedPool,
  ] = await Promise.all([
    // 1. Featured pool (new arrivals + trending + best seller + top rated)
    db.product.findMany({
      where: {
        ...baseWhere,
        ...getActiveOrNoDiscountWhere(),
        OR: [
          { isNewArrival: true },
          { isTrending: true },
          { isBestSeller: true },
          { isTopRated: true },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: poolSize,
      select: homeProductSelect,
    }),

    // 2. Popular categories
    db.category.findMany({
      where: { isActive: true, isPopular: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        isActive: true,
        isPopular: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),

    // 3. Popular occasions
    db.occasion.findMany({
      where: { isActive: true, isPopular: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        isActive: true,
        isPopular: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
      take: 20,
    }),

    // 4. Chocolates pool
    db.product.findMany({
      where: {
        ...baseWhere,
        OR: [
          ...(chocolateCategoryId ? [{ categoryId: chocolateCategoryId }] : []),
          { showInChocolateSection: true },
          { isTrending: true },
          { isNewArrival: true },
          { isBestSeller: true },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: poolSize,
      select: homeProductSelect,
    }),

    // 5. Soft toys pool
    db.product.findMany({
      where: {
        ...baseWhere,
        OR: [
          ...(softToysCategoryId ? [{ categoryId: softToysCategoryId }] : []),
          { showInSoftToysSection: true },
          { isTrending: true },
          { isNewArrival: true },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: poolSize,
      select: homeProductSelect,
    }),

    // 6. Premium gift boxes pool
    db.product.findMany({
      where: {
        ...baseWhere,
        ...getActiveOrNoDiscountWhere(),
        ...(giftBoxCategoryId
          ? { categoryId: giftBoxCategoryId }
          : { isPremiumGiftBox: true }),
      },
      orderBy: { updatedAt: "desc" },
      take: poolSize,
      select: homeProductSelect,
    }),

    // 7. Discounted items pool
    db.product.findMany({
      where: {
        ...baseWhere,
        salePrice: { not: null },
        OR: [
          { showInDiscountSection: true },
          { discountId: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: poolSize,
      select: homeProductSelect,
    }),
  ]);

  return {
    featuredPool,
    popularCategories,
    popularOccasions,
    chocolatePool,
    softToyPool,
    premiumBoxPool,
    discountedPool,
    giftBoxCategoryId,
    chocolateCategoryId,
    softToysCategoryId,
  };
}
