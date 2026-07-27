import { ProductCard } from "@/components/giftbox/ProductCard";
import { getFilteredProducts, type CategoriesFilters } from "../data";
import { ProductsTopBar } from "./ProductsTopBar";
import { Pagination } from "./Pagination";
import { getTranslations } from "next-intl/server";

type CategoryMeta = {
  id: string;
  name: string;
  parentId?: string | null;
};

type ProductImage = {
  url: string;
  isMain: boolean;
};

function parseProductImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const image = item as { url?: unknown; isMain?: unknown };
      if (typeof image.url !== "string" || !image.url) return null;
      return { url: image.url, isMain: typeof image.isMain === "boolean" ? image.isMain : false };
    })
    .filter((item): item is ProductImage => Boolean(item));
}

export async function ProductsGrid({ filters, categoriesMeta }: { filters: CategoriesFilters; categoriesMeta: CategoryMeta[] }) {
  const t = await getTranslations("Categories");
  const result = await getFilteredProducts(
    filters.categories,
    filters.occasion,
    filters.mood,
    filters.recipient,
    filters.priceMin,
    filters.priceMax,
    filters.inStock,
    filters.sort,
    filters.limit,
    filters.filter,
    filters.page
  );

  const products = result.items.map((product) => {
    const images = parseProductImages(product.productImages);
    const mainImage = images.find((image) => image.isMain)?.url || images[0]?.url || "/logo/logo.png";

    const hasDiscount = Boolean(product.discount && typeof product.salePrice === "number" && product.salePrice < product.price);

    return {
      id: product.id,
      name: product.name,
      slug: product.name.toLowerCase().replace(/\s+/g, "-"),
      description: "",
      shortDescription: product.shortDescription || product.category?.name || "Curated gifting product",
      price: hasDiscount && product.salePrice ? product.salePrice : product.price,
      originalPrice: hasDiscount ? product.price : undefined,
      salePrice: product.salePrice ?? undefined,
      images: [mainImage],
      categoryId: product.category?.id || "",
      occasionIds: product.occasions.map((occasion) => occasion.id),
      tags: [],
      inStock: !(product.stock <= 0 || (product.isPremiumGiftBox && (product.itemsInside ?? []).some((boxItem: any) => boxItem.item.stock < boxItem.quantity))),
      isNewArrival: Boolean(product.isNewArrival),
      isTrending: Boolean(product.isTrending),
      rating: product.reviews?.length > 0 
        ? product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / product.reviews.length 
        : 0,
      reviewCount: product.reviews?.length || 0,
      productVariants: product.productVariants,
      sizes: product.sizes,
      colors: product.colors,
      capacityUnits: 1,
    };
  });

  const isListView = (filters.view || "grid") === "list";
  const ctaMode = filters.byob ? "byob" : "default";

  return (
    <section className="relative min-h-[420px]">
      <ProductsTopBar totalCount={result.total} visibleCount={products.length} categories={categoriesMeta} />

      {products.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-10 text-center text-[#6B5A64]">
          {t("noProductsFound")}
        </div>
      ) : (
        <>
          <div className={isListView ? "grid grid-cols-1 gap-4 p-4 xs:gap-3 xs:p-3 sm:p-0" : "grid grid-cols-1 gap-4 p-4 xs:grid-cols-2 xs:gap-3 xs:p-3 md:grid-cols-3 md:p-0 lg:grid-cols-4 lg:gap-6"}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product as any}
                variant={isListView ? "horizontal" : "default"}
                ctaMode={ctaMode}
                priority={index < 4}
              />
            ))}
          </div>
          <Pagination totalPages={result.totalPages} currentPage={result.currentPage} />
        </>
      )}
    </section>
  );
}
