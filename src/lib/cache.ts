import { unstable_cache as cache } from "next/cache";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { normalizeSpecialTouchProducts } from "@/lib/special-touch";

/**
 * Cached navigation categories for 1 hour
 * Tag: 'categories' for on-demand revalidation
 */
export const getCachedNavCategories = cache(
  async () => {
    let hideEmpty = false;
    try {
      const config = await withDbRetry(() => db.shippingConfig.findUnique({
        where: { id: "default" },
        select: { hideEmptyCategories: true },
      }), { label: 'getCachedNavCategories.config' });
      hideEmpty = config?.hideEmptyCategories ?? false;
    } catch {
      // Fallback: show all categories if config fetch fails
    }

    const allCategories = await withDbRetry(() => db.category.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { stock: { gt: 0 }, isActive: true },
          select: { id: true },
          take: 1
        }
      },
      orderBy: { name: "asc" },
    }), { label: 'getCachedNavCategories.categories' });

    let finalCategories = allCategories;

    if (hideEmpty) {
      finalCategories = allCategories.filter(cat => {
        // Has direct products
        if (cat.products && cat.products.length > 0) return true;
        
        // Has children with products
        const children = allCategories.filter(c => c.parentId === cat.id);
        return children.some(child => child.products && child.products.length > 0);
      });
    }

    return finalCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId
    }));
  },
  ["nav-categories"],
  {
    revalidate: 3600,
    tags: ["categories"],
  }
);

/**
 * Cached special touch products for 30 minutes
 * Tag: 'products' for on-demand revalidation
 */
export const getCachedSpecialTouch = cache(
  async () => {
    try {
      const rows = await withDbRetry(() => db.product.findMany({
        where: {
          isActive: true,
          isSpecialTouch: true,
          stock: {
            gt: 0,
          },
        },
        orderBy: [{ specialTouchOrder: "asc" }, { createdAt: "desc" }],
        take: 4,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          salePrice: true,
          stock: true,
          categoryId: true,
          productImages: true,
          specialTouchOrder: true,
        },
      }), { label: 'getCachedSpecialTouch.products' });

      return normalizeSpecialTouchProducts(rows);
    } catch (error) {
      console.warn("Failed to load cached special touch products:", error);
      return [];
    }
  },
  ["special-touch-products"],
  {
    revalidate: 1800,
    tags: ["products"],
  }
);

/**
 * Cached shipping configuration for 24 hours
 * Tag: 'shipping-config' for on-demand revalidation
 */
export const getCachedShippingConfig = cache(
  async () => {
    try {
      return await withDbRetry(() => db.shippingConfig.findUnique({
        where: { id: "default" },
      }), { label: 'getCachedShippingConfig.config' });
    } catch (error) {
      console.warn("Failed to load cached shipping config:", error);
      return null;
    }
  },
  ["shipping-config"],
  {
    revalidate: 86400,
    tags: ["shipping-config"],
  }
);
