// Synced Category hierarchy with forced client refresh
import { Header, Footer, Hero, ProductCard, PremiumBoxCard, CategoryCard, OccasionCard, CartDrawer, SectionHeading, CategoryGridSkeleton, OccasionGridSkeleton, SectionSkeleton, PromoBanner, ChocolatesSection as ChocolatesHomeSection, SoftToysSection as SoftToysHomeSection } from "@/components/giftbox";
// Refreshed to sync hydration
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { getFeaturedProducts } from "@/data";
import { Sparkles, Truck, Shield, Clock, CreditCard } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/store-config";
import { isGiftBoxEffectivelyOutOfStock } from "@/lib/gift-box-stock";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { shuffleArray } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/queries/feature-toggles";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const storefrontHasImageWhere: Prisma.ProductWhereInput = {
  NOT: {
    productImages: {
      equals: [],
    },
  },
};

function getActiveDiscountWhere(now = new Date()): Prisma.DiscountWhereInput {
  return {
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
}

function getActiveOrNoDiscountWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    OR: [{ discountId: null }, { discount: { is: getActiveDiscountWhere(now) } }],
  };
}

type DiscountView = {
  id: string;
  name: string;
  value: number;
  type: "PERCENTAGE" | "FIXED";
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

type HomeProductRecord = {
  id: string;
  name: string;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  categoryId: string | null;
  productImages: unknown;
  productVariants?: unknown;
  sizes?: string[];
  colors?: string[];
  discount?: DiscountView | null;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isTopRated: boolean;
  showInDiscountSection: boolean;
  showInChocolateSection: boolean;
  showInSoftToysSection: boolean;
  itemsInside: Array<{
    quantity: number;
    item: { stock: number };
  }>;
  reviews: Array<{ rating: number }>;
};

type PremiumBoxRecord = {
  id: string;
  name: string;
  shortDescription: string | null;
  price: number;
  stock: number;
  productImages: unknown;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isTopRated: boolean;
  itemsInside: Array<{
    itemId: string;
    quantity: number;
    item: {
      id: string;
      name: string;
      stock: number;
    };
  }>;
};

function mapDbProductToCardProduct(product: HomeProductRecord) {
  let images: string[] = [];
  if (Array.isArray(product.productImages)) {
    // Find the lead image if there is one with isMain === true
    const leadImageObj = product.productImages.find(
      (img: any) => img && typeof img === 'object' && img.isMain === true
    );
    const leadImageUrl = leadImageObj ? (leadImageObj as any).url || (leadImageObj as any).src : null;

    const allUrls = product.productImages
      .map((image) => {
        if (typeof image === "string") return image;
        if (image && typeof image === "object" && "url" in image && typeof (image as { url?: unknown }).url === "string") {
          return (image as { url: string }).url;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    if (leadImageUrl && typeof leadImageUrl === "string") {
      images = [leadImageUrl, ...allUrls.filter(url => url !== leadImageUrl)];
    } else {
      images = allUrls;
    }
  }

  const hasDiscount = (typeof product.salePrice === "number" && product.salePrice < product.price) || Boolean(product.discount);
  const finalPrice = hasDiscount && product.salePrice !== null && product.salePrice !== undefined ? product.salePrice : product.price;

  return {
    id: product.id,
    name: product.name,
    slug: product.name.toLowerCase().replace(/\s+/g, "-"),
    description: "",
    shortDescription: product.shortDescription || "",
    price: finalPrice,
    originalPrice: hasDiscount ? product.price : undefined,
    images,
    categoryId: product.categoryId || "",
    occasionIds: [],
    tags: [],
    rating: product.reviews?.length > 0
      ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
      : 0,
    reviewCount: product.reviews?.length || 0,
    inStock: product.stock > 0,
    isPremiumGiftBox: Boolean(product.itemsInside?.length),
    itemsInside: product.itemsInside,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isTrending: product.isTrending,
    isTopRated: product.isTopRated,
    showInDiscountSection: product.showInDiscountSection,
    showInChocolateSection: product.showInChocolateSection,
    showInSoftToysSection: product.showInSoftToysSection,
    productVariants: product.productVariants,
    sizes: product.sizes,
    colors: product.colors,
    isFeatured: false,
    capacityUnits: 5,
  };
}

export default async function HomePage() {
  const isWebsiteEnabled = await isFeatureEnabled("storefront_website_enabled");
  if (!isWebsiteEnabled) {
    redirect("/sign-in");
  }

  const isGiftboxesAvailable = await isFeatureEnabled("giftboxes_available");

  const t = await getTranslations("HomePage");
  const session = await getServerSession(authOptions);
  const storeConfig = await getStoreConfig();
  const hideOOS = storeConfig.hideOutOfStockProducts;

  // Force dynamic rendering on every request by reading headers
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "";
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Suggested For You - Only if authenticated */}
        {session && (
          <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
            <SuggestedForYouSection userId={session.user?.id} isMobile={isMobile} />
          </Suspense>
        )}

        {/* 3. New Arrivals */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
          <NewArrivalsSection hideOutOfStock={hideOOS} isMobile={isMobile} />
        </Suspense>

        {/* 4. Trending Now */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
          <TrendingNowSection hideOutOfStock={hideOOS} isMobile={isMobile} />
        </Suspense>

        {/* 5. Promotional Banner 1 */}
        <Suspense fallback={null}>
          <PromoBanner bannerKey="promo_1" />
        </Suspense>

        {/* 6. Trending Categories */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><CategoryGridSkeleton /></div>}>
          <TrendingCategoriesSection hideEmptyCategories={storeConfig.hideEmptyCategories} />
        </Suspense>

        {/* 7. Trending Occasions */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><OccasionGridSkeleton /></div>}>
          <TrendingOccasionsSection />
        </Suspense>

        {/* 8. Build Your Own Box Section */}
        {isGiftboxesAvailable && (
          <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#A7066A] to-[#E91E8C] p-8 lg:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10 text-center">
                <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4">
                  {t("buildYourOwnCustomBox")}
                </h2>
                <p className="text-white/90 mb-6 max-w-xl mx-auto">
                  {t("buildYourOwnCustomBoxDesc")}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[#A7066A] hover:bg-white/90 rounded-full px-8"
                >
                  <Link href="/box-builder">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("startBuilding")}
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 9. Premium Gift Boxes */}
        {isGiftboxesAvailable && (
          <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
            <PremiumGiftBoxesSection hideOutOfStock={hideOOS} isMobile={isMobile} />
          </Suspense>
        )}

        {/* 10. Chocolates */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
          <ChocolatesSection hideOutOfStock={hideOOS} isMobile={isMobile} />
        </Suspense>

        {/* 11. Promotional Banner 2 */}
        <Suspense fallback={null}>
          <PromoBanner bannerKey="promo_2" />
        </Suspense>

        {/* 12. Discounted Items */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
          <DiscountedItemsSection hideOutOfStock={hideOOS} isMobile={isMobile} />
        </Suspense>

        {/* 13. Soft Toys */}
        <Suspense fallback={<div className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto"><SectionSkeleton /></div>}>
          <SoftToysSection hideOutOfStock={hideOOS} isMobile={isMobile} />
        </Suspense>

        {/* Trust Badges */}
        <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 justify-start">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FCEAF4]/30 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-[#A7066A]/10 flex items-center justify-center mb-3">
                <Truck className="w-6 h-6 text-[#A7066A]" />
              </div>
              <h3 className="font-semibold text-[#1F1720]">{t("islandWideDelivery")}</h3>
              <p className="text-sm text-[#6B5A64] mt-1">{t("islandWideDeliveryDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FCEAF4]/30 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-[#A7066A]/10 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-[#A7066A]" />
              </div>
              <h3 className="font-semibold text-[#1F1720]">{t("qualityGuaranteed")}</h3>
              <p className="text-sm text-[#6B5A64] mt-1">{t("qualityGuaranteedDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FCEAF4]/30 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-[#A7066A]/10 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-[#A7066A]" />
              </div>
              <h3 className="font-semibold text-[#1F1720]">{t("sameDayDelivery")}</h3>
              <p className="text-sm text-[#6B5A64] mt-1">{t("sameDayDeliveryDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FCEAF4]/30 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-[#A7066A]/10 flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-[#A7066A]" />
              </div>
              <h3 className="font-semibold text-[#1F1720]">{t("securePayment")}</h3>
              <p className="text-sm text-[#6B5A64] mt-1">{t("securePaymentDesc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#FCEAF4]/30 transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-[#A7066A]/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-[#A7066A]" />
              </div>
              <h3 className="font-semibold text-[#1F1720]">{t("premiumSupport")}</h3>
              <p className="text-sm text-[#6B5A64] mt-1">{t("premiumSupportDesc")}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ========== Async Components for Data-Heavy Sections ==========

async function SuggestedForYouSection({ userId, isMobile }: { userId?: string; isMobile?: boolean }) {
  const t = await getTranslations("HomePage");
  if (!userId) return null;

  let suggestedProducts: any[] = [];
  const commonSelect = {
    id: true,
    name: true,
    shortDescription: true,
    price: true,
    salePrice: true,
    isNewArrival: true,
    isTrending: true,
    isBestSeller: true,
    isTopRated: true,
    showInDiscountSection: true,
    showInChocolateSection: true,
    showInSoftToysSection: true,
    stock: true,
    categoryId: true,
    productVariants: true, colors: true, sizes: true, productImages: true,
    discount: true,
    reviews: {
      where: { status: "APPROVED" },
      select: { rating: true },
    },
    itemsInside: {
      select: {
        quantity: true,
        item: { select: { stock: true } },
      },
    },
  };

  try {
    const lastOrder = await db.order.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true }
    });

    if (lastOrder && lastOrder.items.length > 0) {
      const boughtProductIds = lastOrder.items.map(item => item.productId);

      const productsBought = await db.product.findMany({
        where: { id: { in: boughtProductIds } },
        select: { categoryId: true }
      });

      const categoryIds = Array.from(new Set(productsBought.map(p => p.categoryId).filter(Boolean))) as string[];

      if (categoryIds.length > 0) {
        const pool = await (db.product as any).findMany({
          where: {
            isActive: true,
            stock: { gt: 0 },
            categoryId: { in: categoryIds },
            id: { notIn: boughtProductIds },
            ...storefrontHasImageWhere,
          },
          select: commonSelect
        });

        const filteredPool = pool.filter((p: any) => !isGiftBoxEffectivelyOutOfStock(p.itemsInside));
        suggestedProducts = shuffleArray(filteredPool).slice(0, 5);
      }
    }

    if (suggestedProducts.length === 0) {
      const pool = await (db.product as any).findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
          OR: [
            { isBestSeller: true },
            { isTrending: true }
          ],
          ...storefrontHasImageWhere,
        },
        select: commonSelect
      });

      const filteredPool = pool.filter((p: any) => !isGiftBoxEffectivelyOutOfStock(p.itemsInside));
      suggestedProducts = shuffleArray(filteredPool).slice(0, 5);
    }
  } catch (error) {
    console.error("Failed to fetch suggested products:", error);
    return null;
  }

  if (suggestedProducts.length === 0) return null;

  let displayProducts = suggestedProducts.slice(0, 5);
  if (isMobile && displayProducts.length === 3) {
    displayProducts = displayProducts.slice(0, 2);
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
      <SectionHeading
        title={t("suggestedForYou")}
        subtitle={t("suggestedForYouSubtitle")}
        showViewAll
        viewAllLink="/categories"
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
        {displayProducts.map((product, index) => (
          <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
            <ProductCard product={mapDbProductToCardProduct(product as HomeProductRecord)} hideBadges={true} />
          </div>
        ))}
      </div>
    </section>
  );
}

async function NewArrivalsSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};

    const pool = await (db.product as any).findMany({
      where: {
        isActive: true,
        ...stockFilter,
        ...getActiveOrNoDiscountWhere(),
        ...storefrontHasImageWhere,
        OR: [
          { isNewArrival: true },
          { isTrending: true },
          { isBestSeller: true },
          { isTopRated: true }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        stock: true,
        categoryId: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { stock: true } },
          },
        },
      },
    });

    const shuffledPool = shuffleArray([...pool]);
    const qualifyingProducts = hideOutOfStock
      ? shuffledPool.filter((product: any) => {
        if (product.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(product.itemsInside);
      })
      : shuffledPool;

    let displayProducts = qualifyingProducts.slice(0, 5);
    if (isMobile && displayProducts.length === 3) {
      displayProducts = displayProducts.slice(0, 2);
    }

    if (displayProducts.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("newArrivals")}
          subtitle={t("newArrivalsSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=new-arrivals&sort=newest"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
              <ProductCard product={mapDbProductToCardProduct(product as HomeProductRecord)} activeBadge="new" />
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch new arrivals:", error);
    return null;
  }
}

async function TrendingNowSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};

    const pool = await (db.product as any).findMany({
      where: {
        isActive: true,
        ...stockFilter,
        ...getActiveOrNoDiscountWhere(),
        ...storefrontHasImageWhere,
        OR: [
          { isTrending: true },
          { isNewArrival: true },
          { isBestSeller: true },
          { isTopRated: true }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        stock: true,
        categoryId: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { stock: true } },
          },
        },
      },
    });

    const shuffledPool = shuffleArray([...pool]);
    const qualifyingProducts = hideOutOfStock
      ? (shuffledPool as any[]).filter((product) => {
        if (product.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(product.itemsInside);
      })
      : shuffledPool;

    let displayProducts = qualifyingProducts.slice(0, 5);
    if (isMobile && displayProducts.length === 3) {
      displayProducts = displayProducts.slice(0, 2);
    }

    if (displayProducts.length === 0) return null;

    return (
      <section className="pt-4 pb-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("trendingNow")}
          subtitle={t("trendingNowSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=trending"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
              <ProductCard product={mapDbProductToCardProduct(product as HomeProductRecord)} activeBadge="trending" />
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch trending now products:", error);
    return null;
  }
}

async function TrendingCategoriesSection({ hideEmptyCategories }: { hideEmptyCategories: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    // STRICT: Only fetch categories the admin explicitly toggled as trending
    const trendingCategories = await db.category.findMany({
      where: {
        isActive: true,
        isPopular: true,
      },
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
    });

    console.log(`[TrendingCategories] ${new Date().toISOString()} — STRICT query returned ${trendingCategories.length} categories:`, trendingCategories.map(c => c.name));

    // If no categories are toggled as trending, hide the entire section
    if (trendingCategories.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("trendingCategories")}
          subtitle={t("trendingCategoriesSubtitle")}
          showViewAll
          viewAllLink="/categories"
        />
        <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 md:grid-cols-5 justify-start">
          {trendingCategories.map((category) => (
            <CategoryCard key={category.id} category={category as any} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch trending categories:", error);
    return null;
  }
}

async function TrendingOccasionsSection() {
  try {
    const t = await getTranslations("HomePage");
    const allTrendingOccasions = await db.occasion.findMany({
      where: { isActive: true, isPopular: true },
      orderBy: { name: "asc" },
      take: 20,
    });

    const trendingOccasions = shuffleArray(allTrendingOccasions).slice(0, 5);

    if (trendingOccasions.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("trendingOccasions")}
          subtitle={t("trendingOccasionsSubtitle")}
        />
        <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 md:grid-cols-5 justify-start">
          {trendingOccasions.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion as any} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch trending occasions:", error);
    return null;
  }
}

async function PremiumGiftBoxesSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};
    const giftBoxCategory = await db.category.findFirst({
      where: {
        isActive: true,
        slug: {
          contains: "gift-box",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!giftBoxCategory) {
      return null;
    }

    const premiumBoxes = (await (db.product as any).findMany({
      where: {
        isActive: true,
        categoryId: giftBoxCategory.id,
        ...stockFilter,
        ...getActiveOrNoDiscountWhere(),
        ...storefrontHasImageWhere,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        stock: true,
        showInDiscountSection: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            itemId: true,
            quantity: true,
            item: {
              select: { id: true, name: true, stock: true }
            }
          }
        }
      },
    })) as Array<PremiumBoxRecord>;

    const qualifyingBoxes = hideOutOfStock
      ? premiumBoxes.filter((box: any) => {
        if (box.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(box.itemsInside);
      })
      : premiumBoxes;

    const boxes = shuffleArray(qualifyingBoxes as any[]) as any[];
    let displayBoxes = boxes.slice(0, 5);
    if (isMobile && displayBoxes.length === 3) {
      displayBoxes = displayBoxes.slice(0, 2);
    }

    if (displayBoxes.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("premiumGiftBoxes")}
          subtitle={t("premiumGiftBoxesSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=premium-boxes"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayBoxes.map((box, index) => {
            const isOutOfStock = box.stock <= 0 || isGiftBoxEffectivelyOutOfStock(box.itemsInside);
            let images: string[] = [];
            if (Array.isArray(box.productImages)) {
              const leadImageObj = box.productImages.find(
                (img: any) => img && typeof img === 'object' && img.isMain === true
              );
              const leadImageUrl = leadImageObj ? (leadImageObj as any).url || (leadImageObj as any).src : null;

              const allUrls = box.productImages
                .map((image) => {
                  if (typeof image === "string") return image;
                  if (image && typeof image === "object" && "url" in image && typeof (image as { url?: unknown }).url === "string") {
                    return (image as { url: string }).url;
                  }
                  return null;
                })
                .filter((value): value is string => Boolean(value));

              if (leadImageUrl && typeof leadImageUrl === "string") {
                images = [leadImageUrl, ...allUrls.filter(url => url !== leadImageUrl)];
              } else {
                images = allUrls;
              }
            }

            return (
              <div key={box.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
                <PremiumBoxCard
                  id={box.id}
                  name={box.name}
                  shortDescription={box.shortDescription}
                  price={box.price}
                  images={images}
                  inStock={!isOutOfStock}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch premium gift boxes:", error);
    return null;
  }
}

async function ChocolatesSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};
    const chocolateCategory = await db.category.findFirst({
      where: { slug: "chocolates", isActive: true }
    });

    // Broadened pool: chocolate items + fallback featured items to guarantee 5+
    const pool = await (db.product as any).findMany({
      where: {
        isActive: true,
        ...stockFilter,
        ...storefrontHasImageWhere,
        OR: [
          ...(chocolateCategory ? [{ categoryId: chocolateCategory.id }] : []),
          { showInChocolateSection: true },
          { isTrending: true },
          { isNewArrival: true },
          { isBestSeller: true },
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        stock: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        categoryId: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { stock: true } },
          },
        },
      }
    });

    const filteredPool = hideOutOfStock
      ? pool.filter((product: any) => {
        if (product.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(product.itemsInside);
      })
      : pool;

    // Prioritize: chocolate items first, then fallback items
    const isChocolateItem = (p: any) =>
      p.showInChocolateSection === true ||
      (chocolateCategory && p.categoryId === chocolateCategory.id);

    const chocolateItems = filteredPool.filter((p: any) => isChocolateItem(p));
    const fallbackItems = filteredPool.filter((p: any) => !isChocolateItem(p));

    // Shuffle each group independently, then combine: chocolates first
    const shuffledChocolates = shuffleArray([...chocolateItems]);
    const shuffledFallback = shuffleArray([...fallbackItems]);
    const products = [...shuffledChocolates, ...shuffledFallback].slice(0, 5);
    let displayProducts = products;
    if (isMobile && displayProducts.length === 3) {
      displayProducts = displayProducts.slice(0, 2);
    }

    if (displayProducts.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("deliciousChocolates")}
          subtitle={t("deliciousChocolatesSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=chocolates"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
              <ProductCard
                product={mapDbProductToCardProduct(product as HomeProductRecord)}
                activeBadge="chocolate"
              />
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch chocolate products:", error);
    return null;
  }
}

async function DiscountedItemsSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};

    // Strict pool: ONLY products with a real price reduction
    const pool = await (db.product as any).findMany({
      where: {
        isActive: true,
        ...stockFilter,
        ...storefrontHasImageWhere,
        salePrice: { not: null },
        OR: [
          { showInDiscountSection: true },
          { discountId: { not: null } },
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        stock: true,
        categoryId: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { stock: true } },
          },
        },
      },
    });

    // Filter stock + ensure salePrice is actually less than price (real discount)
    const realDiscounts = (hideOutOfStock
      ? pool.filter((p: any) => {
        if (p.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(p.itemsInside);
      })
      : pool
    ).filter((p: any) => p.salePrice !== null && p.salePrice < p.price);

    // If strict pool is < 5, fetch additional sale-priced items (without the flag)
    let fallbackItems: any[] = [];
    if (realDiscounts.length < 5) {
      const existingIds = realDiscounts.map((p: any) => p.id);
      const extraPool = await (db.product as any).findMany({
        where: {
          isActive: true,
          ...stockFilter,
          ...storefrontHasImageWhere,
          salePrice: { not: null },
          id: { notIn: existingIds },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          shortDescription: true,
          price: true,
          salePrice: true,
          isNewArrival: true,
          isTrending: true,
          isBestSeller: true,
          isTopRated: true,
          showInDiscountSection: true,
          showInChocolateSection: true,
          showInSoftToysSection: true,
          stock: true,
          categoryId: true,
          productVariants: true, colors: true, sizes: true, productImages: true,
          discount: true,
          reviews: {
            where: { status: "APPROVED" },
            select: { rating: true },
          },
          itemsInside: {
            select: {
              quantity: true,
              item: { select: { stock: true } },
            },
          },
        },
      });

      fallbackItems = extraPool.filter(
        (p: any) => p.salePrice !== null && p.salePrice < p.price
      );
    }

    // Prioritize flagged items, sort each group by highest discount %
    const getDiscountPct = (p: any) =>
      p.price > 0 ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;

    const sortedPrimary = [...realDiscounts].sort((a, b) => getDiscountPct(b) - getDiscountPct(a));
    const sortedFallback = shuffleArray([...fallbackItems]);

    const products = [...sortedPrimary, ...sortedFallback].slice(0, 5);
    let displayProducts = products;
    if (isMobile && displayProducts.length === 3) {
      displayProducts = displayProducts.slice(0, 2);
    }

    if (displayProducts.length === 0) return null;

    return (
      <section className="relative z-10 py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full bg-gradient-to-r from-red-50/30 to-transparent rounded-3xl">
        <SectionHeading
          title={t("discountedItems")}
          subtitle={t("discountedItemsSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=discounted"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
              <ProductCard product={mapDbProductToCardProduct(product as HomeProductRecord)} activeBadge="discount" />
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch discounted products:", error);
    return null;
  }
}

async function SoftToysSection({ hideOutOfStock, isMobile }: { hideOutOfStock: boolean; isMobile?: boolean }) {
  try {
    const t = await getTranslations("HomePage");
    const stockFilter = hideOutOfStock ? { stock: { gt: 0 } } : {};
    const softToysCategory = await db.category.findFirst({
      where: { slug: "soft-toys", isActive: true }
    });

    const softToys = await (db.product as any).findMany({
      where: {
        isActive: true,
        ...stockFilter,
        ...storefrontHasImageWhere,
        OR: [
          ...(softToysCategory ? [{ categoryId: softToysCategory.id }] : []),
          { showInSoftToysSection: true }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isTopRated: true,
        stock: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        categoryId: true,
        productVariants: true, colors: true, sizes: true, productImages: true,
        discount: true,
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
        itemsInside: {
          select: {
            quantity: true,
            item: { select: { stock: true } },
          },
        },
      }
    });

    const filteredProducts = hideOutOfStock
      ? softToys.filter((product: any) => {
        if (product.stock <= 0) return false;
        return !isGiftBoxEffectivelyOutOfStock(product.itemsInside);
      })
      : softToys;

    const products = shuffleArray(filteredProducts as any[]).slice(0, 5) as any[];
    let displayProducts = products;
    if (isMobile && displayProducts.length === 3) {
      displayProducts = displayProducts.slice(0, 2);
    }

    if (displayProducts.length === 0) return null;

    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <SectionHeading
          title={t("softToys")}
          subtitle={t("softToysSubtitle")}
          showViewAll
          viewAllLink="/categories?filter=soft-toys"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-start">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={index === 4 ? "hidden md:block h-full" : "block h-full"}>
              <ProductCard product={mapDbProductToCardProduct(product as HomeProductRecord)} activeBadge="softtoy" />
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch soft toy products:", error);
    return null;
  }
}
