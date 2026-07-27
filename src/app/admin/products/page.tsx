import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { unstable_cache as cache } from "next/cache";
import { Suspense } from "react";

import { db } from "@/lib/db";
import { ProductsClient } from "./products-client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminProductsLoading from "./loading";
import { getStoreConfig } from "@/lib/store-config";
import { isFeatureEnabled } from "@/lib/queries/feature-toggles";
import { ExportInventoryButton } from "./export-inventory-button";

type ProductsTab = "standard" | "gift-boxes";

type AdminProductsQueryInput = {
  q: string;
  category: string;
  occasion: string;
  stock: string;
  isTrending: boolean;
  isNewArrival: boolean;
  showInDiscountSection: boolean;
  isTopRated: boolean;
  isBestSeller: boolean;
  showInChocolateSection: boolean;
  showInSoftToysSection: boolean;
  tab: ProductsTab;
  page: number;
  pageSize: number;
};

function normalizeTab(value: unknown): ProductsTab {
  return value === "gift-boxes" ? "gift-boxes" : "standard";
}

function buildBaseWhere(input: Omit<AdminProductsQueryInput, "tab" | "page" | "pageSize">): Prisma.ProductWhereInput {
  const { 
    q, category, occasion, stock, 
    isTrending, isNewArrival, showInDiscountSection,
    isTopRated, isBestSeller, showInChocolateSection, showInSoftToysSection
  } = input;
  const where: Prisma.ProductWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  if (occasion) {
    where.occasions = { some: { id: occasion } };
  }

  if (stock === "in") {
    where.stock = { gt: 0 };
  } else if (stock === "out") {
    where.stock = 0;
  }

  if (isTrending) where.isTrending = true;
  if (isNewArrival) where.isNewArrival = true;
  if (showInDiscountSection) where.showInDiscountSection = true;
  if (isTopRated) where.isTopRated = true;
  if (isBestSeller) where.isBestSeller = true;
  if (showInChocolateSection) where.showInChocolateSection = true;
  if (showInSoftToysSection) where.showInSoftToysSection = true;

  return where;
}

const getAdminProductsData = cache(
  async (input: AdminProductsQueryInput) => {
    const { tab, page, pageSize } = input;
    const baseWhere = buildBaseWhere(input);
    const where: Prisma.ProductWhereInput = {
      ...baseWhere,
      isPremiumGiftBox: tab === "gift-boxes",
    };

    const standardWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
      isPremiumGiftBox: false,
    };

    const giftBoxesWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
      isPremiumGiftBox: true,
    };

    const skip = (page - 1) * pageSize;

    const [products, totalCount, standardCount, giftBoxesCount] = await db.$transaction([
      db.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          salePrice: true,
          stock: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
          occasions: {
            select: { id: true, name: true },
          },
          sizes: true,
          colors: true,
          productImages: true,
          isActive: true,
          isNewArrival: true, isTrending: true, showInDiscountSection: true, isTopRated: true, isBestSeller: true, showInChocolateSection: true, showInSoftToysSection: true,
          isSpecialTouch: true,
          specialTouchOrder: true,
          createdAt: true,
          isPremiumGiftBox: true,
          itemsInside: {
            select: {
              itemId: true,
              quantity: true,
              item: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.product.count({ where }),
      db.product.count({ where: standardWhere }),
      db.product.count({ where: giftBoxesWhere }),
    ]);

    return {
      products,
      totalCount,
      standardCount,
      giftBoxesCount,
    };
  },
  ["admin-products-tabbed-table"],
  { revalidate: 60, tags: ["admin-products"] }
);

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    occasion?: string;
    stock?: string;
    trending?: string;
    newArrival?: string;
    discount?: string;
    topRated?: string;
    bestSeller?: string;
    chocolates?: string;
    softToys?: string;
    tab?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category || "";
  const occasion = params.occasion || "";
  const stock = params.stock || "all";
  const isTrending = params.trending === "true";
  const isNewArrival = params.newArrival === "true";
  const showInDiscountSection = params.discount === "true";
  const isTopRated = params.topRated === "true";
  const isBestSeller = params.bestSeller === "true";
  const showInChocolateSection = params.chocolates === "true";
  const showInSoftToysSection = params.softToys === "true";
  const isGiftboxesAvailable = await isFeatureEnabled("giftboxes_available");
  const tab = isGiftboxesAvailable ? normalizeTab(params.tab) : "standard";
  const pageRaw = Number(params.page);
  const pageSizeRaw = Number(params.pageSize);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw >= 20 && pageSizeRaw <= 50 ? Math.floor(pageSizeRaw) : 20;

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/"); // unauthorized
  }

  const { products, totalCount, standardCount, giftBoxesCount } = await getAdminProductsData({
    q,
    category,
    occasion,
    stock,
    isTrending,
    isNewArrival,
    showInDiscountSection,
    isTopRated,
    isBestSeller,
    showInChocolateSection,
    showInSoftToysSection,
    tab,
    page,
    pageSize,
  });

  const storeConfig = await getStoreConfig();

  const makeTabHref = (nextTab: ProductsTab) => {
    const qp = new URLSearchParams();
    qp.set("tab", nextTab);
    if (q) qp.set("q", q);
    if (category) qp.set("category", category);
    if (occasion) qp.set("occasion", occasion);
    if (stock !== "all") qp.set("stock", stock);
    if (isTrending) qp.set("trending", "true");
    if (isNewArrival) qp.set("newArrival", "true");
    if (showInDiscountSection) qp.set("discount", "true");
    if (isTopRated) qp.set("topRated", "true");
    if (isBestSeller) qp.set("bestSeller", "true");
    if (showInChocolateSection) qp.set("chocolates", "true");
    if (showInSoftToysSection) qp.set("softToys", "true");
    if (pageSize !== 20) qp.set("pageSize", String(pageSize));
    return `/admin/products?${qp.toString()}`;
  };

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={tab} className="w-full md:w-auto">
            <TabsList className="h-11 bg-white border border-brand-border p-1 shadow-sm">
              <TabsTrigger
                value="standard"
                asChild
                className="h-9 px-6 text-gray-500 hover:text-[#A7066A] transition-all duration-200 ease-in-out font-semibold data-[state=active]:!bg-[#A7066A] data-[state=active]:!text-white data-[state=active]:!shadow-[0_4px_12px_rgba(167,6,106,0.25)]"
              >
                <Link href={makeTabHref("standard")}>Standard Products ({standardCount})</Link>
              </TabsTrigger>
              {isGiftboxesAvailable && (
                <TabsTrigger
                  value="gift-boxes"
                  asChild
                  className="h-9 px-6 text-gray-500 hover:text-[#A7066A] transition-all duration-200 ease-in-out font-semibold data-[state=active]:!bg-[#A7066A] data-[state=active]:!text-white data-[state=active]:!shadow-[0_4px_12px_rgba(167,6,106,0.25)]"
                >
                  <Link href={makeTabHref("gift-boxes")}>Gift Boxes ({giftBoxesCount})</Link>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role) && (
              <ExportInventoryButton />
            )}
            
            <Button asChild className="bg-[#A7066A] hover:bg-[#8A0558] text-white shadow-lg shadow-[#A7066A]/20 w-full md:w-auto">
              <Link href="/admin/products/new">
                <Plus className="w-5 h-5 mr-2" />
                Add New Product
              </Link>
            </Button>
          </div>
        </div>

        <Suspense fallback={<AdminProductsLoading />}>
          <ProductsClient
            initialProducts={products}
            initialPage={page}
            initialPageSize={pageSize}
            initialTotal={totalCount}
            initialTab={tab}
            initialFilters={{
              q,
              category,
              occasion,
              stock,
              isTrending,
              isNewArrival,
              showInDiscountSection,
              isTopRated,
              isBestSeller,
              showInChocolateSection,
              showInSoftToysSection
            }}
            hideOutOfStockConfig={storeConfig.hideOutOfStockProducts}
          />
        </Suspense>
      </div>
    </div>
  );
}
