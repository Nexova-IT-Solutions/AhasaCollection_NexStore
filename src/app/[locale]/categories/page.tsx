import { Suspense } from "react";
import { Footer, Header, CartDrawer, SectionHeading } from "@/components/giftbox";
import { CategorySidebar } from "@/components/categories/category-sidebar";
import { ProductsGrid } from "./_components/ProductsGrid";
import { ProductsGridSkeleton } from "./_components/ProductsGridSkeleton";
import { getFilterMetadata, getPriceRange } from "./data";
import { getStoreConfig } from "@/lib/store-config";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    categories?: string | string[];
    category?: string | string[];
    occasion?: string | string[];
    mood?: string | string[];
    recipient?: string | string[];
    filter?: string | string[];
    price_min?: string | string[];
    price_max?: string | string[];
    in_stock?: string | string[];
    sort?: string | string[];
    view?: string | string[];
    limit?: string | string[];
    page?: string | string[];
    byob?: string | string[];
    categoryId?: string | string[];
  }>;
};

export default async function CategoriesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("Categories");
  const query = await searchParams;
  console.log("RAW searchParams:", JSON.stringify(query));
  const { categories: categoriesData, occasions, recipients, moods } = await getFilterMetadata();
  const priceRange = await getPriceRange();
  const storeConfig = await getStoreConfig();
  const hideOutOfStock = storeConfig.hideOutOfStockProducts;

  const page = query.page ? Number(query.page) : 1;
  const categoriesParam = query.categories;
  const categoryIdParam = query.categoryId;
  const categoryParam = query.category;

  const getIdsFromParam = (param: string | string[] | undefined): string[] => {
    if (!param) return [];
    const vals = Array.isArray(param) ? param : [param];
    return vals.flatMap(v => v.split(",")).map(v => v.trim()).filter(Boolean);
  };

  const categoriesFromParams = getIdsFromParam(categoriesParam);
  const categoriesFromIdParam = getIdsFromParam(categoryIdParam);
  
  const rawCategoryTokens = [...new Set([...categoriesFromParams, ...categoriesFromIdParam])];
  
  let selectedCategoryIds: string[] = rawCategoryTokens.flatMap(token => {
    const bySlug = categoriesData.find((c) => c.slug === token);
    if (bySlug) return [bySlug.id];
    const byId = categoriesData.find((c) => c.id === token);
    return byId ? [byId.id] : [];
  });

  if (selectedCategoryIds.length === 0 && categoryParam) {
    const categorySlugs = Array.isArray(categoryParam) ? categoryParam : [categoryParam];
    selectedCategoryIds = categorySlugs.flatMap(slug => {
      const bySlug = categoriesData.find((c) => c.slug === slug);
      if (bySlug) return [bySlug.id];
      const byId = categoriesData.find((c) => c.id === slug);
      return byId ? [byId.id] : [];
    });
  }
  const getSingleValue = (param: string | string[] | undefined): string | undefined => {
    if (!param) return undefined;
    return Array.isArray(param) ? param[0] : param;
  };

  const occasion = getSingleValue(query.occasion);
  const recipient = getSingleValue(query.recipient);
  const mood = getSingleValue(query.mood);
  const filter = getSingleValue(query.filter);
  const priceMin = query.price_min ? Number(Array.isArray(query.price_min) ? query.price_min[0] : query.price_min) : undefined;
  const priceMax = query.price_max ? Number(Array.isArray(query.price_max) ? query.price_max[0] : query.price_max) : undefined;
  const inStock = (Array.isArray(query.in_stock) ? query.in_stock[0] : query.in_stock) === "true";
  const sort = getSingleValue(query.sort) || (filter === "new-arrivals" ? "newest" : "newest");
  const view = getSingleValue(query.view) || "grid";
  const limit = query.limit ? Number(Array.isArray(query.limit) ? query.limit[0] : query.limit) : 20;
  const byob = (Array.isArray(query.byob) ? query.byob[0] : query.byob) === "1";

  const activeCategory = categoryParam
    ? categoriesData.find(c => {
        const slug = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
        return c.slug === slug || c.id === slug;
      })
    : null;

  const filterTitles: Record<string, { title: string; subtitle: string }> = {
    "new-arrivals": { title: t("filterTitles.new-arrivals"), subtitle: t("filterTitles.new-arrivals-sub") },
    "trending": { title: t("filterTitles.trending"), subtitle: t("filterTitles.trending-sub") },
    "premium-boxes": { title: t("filterTitles.premium-boxes"), subtitle: t("filterTitles.premium-boxes-sub") },
    "chocolates": { title: t("filterTitles.chocolates"), subtitle: t("filterTitles.chocolates-sub") },
    "discounted": { title: t("filterTitles.discounted"), subtitle: t("filterTitles.discounted-sub") },
    "soft-toys": { title: t("filterTitles.soft-toys"), subtitle: t("filterTitles.soft-toys-sub") },
  };

  const pageHeading = filter 
    ? filterTitles[filter] 
    : activeCategory 
      ? { title: activeCategory.name, subtitle: t("explorePremium", { categoryName: activeCategory.name }) }
      : { title: t("discoverProducts"), subtitle: t("discoverProductsSub") };
  const activeOccasion = occasion ? occasions.find(o => o.slug === occasion) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background w-full max-w-full overflow-x-hidden">
      <Header />
      <CartDrawer />

      <main className="flex-1 py-8 px-4 md:px-8 lg:px-10 max-w-full xl:max-w-[1600px] mx-auto w-full overflow-x-hidden">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm text-[#6B5A64] mb-6">
          <Link href="/" className="hover:text-[#A7066A] transition-colors">{t("home")}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className={activeOccasion || filter ? "text-[#6B5A64]" : "text-[#1F1720] font-medium"}>
            {activeOccasion || filter ? (
              <Link href="/categories" className="hover:text-[#A7066A] transition-colors">{t("categories")}</Link>
            ) : (
              t("allCategories")
            )}
          </span>
          {(activeOccasion || filter) && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#1F1720] font-medium">{activeOccasion?.name || pageHeading.title}</span>
            </>
          )}
        </nav>

        {activeOccasion ? (
          <div className="relative h-48 sm:h-64 overflow-hidden rounded-3xl mb-8 group">
            <div 
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
              style={{ backgroundImage: `url(${activeOccasion.image || '/placeholder.jpg'})` }}
            />
            <div 
              className="absolute inset-0"
              style={{ 
                background: `linear-gradient(to top, ${(activeOccasion as any).color || '#A7066A'}CC, transparent)` 
              }}
            />
            <div className="relative h-full px-6 md:px-10 flex flex-col justify-end pb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{t("gifts", { occasionName: activeOccasion.name })}</h1>
              {activeOccasion.description && (
                <p className="text-white/90 mt-2 max-w-xl line-clamp-2">{activeOccasion.description}</p>
              )}
            </div>
          </div>
        ) : (
          <SectionHeading title={pageHeading.title} subtitle={pageHeading.subtitle} />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8 mt-8">
          <Suspense fallback={<div className="h-[400px] bg-white border border-brand-border rounded-3xl animate-pulse" />}>
            <CategorySidebar
              categories={categoriesData}
              occasions={occasions}
              recipients={recipients}
              moods={moods}
              priceRangeMetadata={priceRange}
              hideOutOfStock={hideOutOfStock}
              initialValues={{ categories: selectedCategoryIds, occasion, recipient, mood, filter, priceMin, priceMax, inStock, sort, view, limit, page, byob }}
            />
          </Suspense>

          <Suspense key={`${filter ?? "all"}-${selectedCategoryIds.join(".") || "all"}-${occasion ?? "all"}-${recipient ?? "all"}-${mood ?? "all"}-${priceMin ?? ""}-${priceMax ?? ""}-${inStock}-${sort}-${view}-${limit}-${page}-${byob}`} fallback={<ProductsGridSkeleton />}>
            <ProductsGrid
              filters={{ categories: selectedCategoryIds, occasion, recipient, mood, filter, priceMin, priceMax, inStock, sort, view, limit, page, byob }}
              categoriesMeta={categoriesData}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
