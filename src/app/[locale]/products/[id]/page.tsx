import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, CartDrawer, ProductCard } from "@/components/giftbox";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ProductDetailClient } from "../../product/[slug]/product-detail-client";
import { CustomerReviewsSection } from "@/components/reviews/CustomerReviewsSection";

const storefrontHasImageWhere: Prisma.ProductWhereInput = {
  NOT: { productImages: { equals: [] } },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function parseImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const image = item as { url?: unknown; isMain?: unknown; color?: unknown };
      if (typeof image.url !== "string" || !image.url) return null;
      return {
        url: image.url,
        isMain: typeof image.isMain === "boolean" ? image.isMain : false,
        color: typeof image.color === "string" ? image.color : undefined,
      };
    })
    .filter((item): item is { url: string; isMain: boolean; color?: string } => item !== null);

  const mainImage = parsed.find(img => img.isMain);
  if (mainImage) {
    return [mainImage, ...parsed.filter(img => img !== mainImage)];
  }
  return parsed;
}

function parseVariants(value: unknown) {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const variant = item as { size?: unknown; color?: unknown; price?: unknown; stock?: unknown; image?: unknown; imageUrl?: unknown };
      const size = typeof variant.size === "string" ? variant.size : "";
      const color = typeof variant.color === "string" ? variant.color : "";
      const cleanColor = color.split('|')[0];
      const name = [size, cleanColor].filter(Boolean).join(" / ") || "Default";
      const id = `${size || "default"}:${color || "default"}`;
      const price = Number(variant.price);
      const stock = Number(variant.stock);
      const image = (typeof variant.image === "string" ? variant.image : "") || (typeof variant.imageUrl === "string" ? variant.imageUrl : "");
      return {
        id,
        name,
        price: Number.isFinite(price) ? price : 0,
        inStock: Number.isFinite(stock) ? stock > 0 : true,
        image: image || undefined,
      };
    })
    .filter((item) => Boolean(item));
  return parsed;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    select: { name: true, description: true, shortDescription: true, productImages: true },
  });
  if (!product) return { title: "Product Not Found | Giftbox Lanka" };
  const image = parseImages(product.productImages)[0]?.url;
  return {
    title: `${product.name} | Giftbox Lanka`,
    description: product.shortDescription || product.description?.slice(0, 160) || "Discover curated gifts at Giftbox Lanka.",
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description?.slice(0, 160) || "",
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductsByIdPage({ params }: PageProps) {
  const { id } = await params;

  const product = await (db.product as any).findFirst({
    where: { id, isActive: true },
    include: {
      category: { select: { name: true, slug: true, parentId: true } },
      occasions: { select: { id: true, name: true, slug: true } },
      discount: true,
      reviews: {
        where: { status: "APPROVED" },
        select: { rating: true },
      },
      itemsInside: {
        include: {
          item: { select: { id: true, name: true, stock: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { itemId: "asc" }],
      },
    },
  });

  if (!product) notFound();

  const images = parseImages(product.productImages);
  const variants = parseVariants(product.productVariants);

  const reviewsData = (product.reviews as { rating: number }[]) || [];
  const reviewCount = reviewsData.length;
  const averageRating = reviewCount > 0 
    ? reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewCount 
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 py-10 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <ProductDetailClient
          product={{
            id: product.id,
            name: product.name,
            description: product.description || "",
            shortDescription: product.shortDescription || "",
            price: product.price,
            salePrice: product.salePrice,
            discount: product.discount,
            stock: product.stock,
            sizes: product.sizes,
            colors: product.colors,
            images: images as any,
            variants: variants as any,
            category: product.category,
            occasions: product.occasions,
            isPremiumGiftBox: product.isPremiumGiftBox,
            averageRating,
            reviewCount,
            itemsInside: (product.itemsInside ?? []).map((entry: any) => ({
              itemId: entry.itemId,
              itemName: entry.item.name,
              quantity: entry.quantity,
              itemStock: entry.item.stock,
            })),
          }}
          reviews={<CustomerReviewsSection productId={product.id} />}
        />

        <Suspense fallback={<RelatedProductsSkeleton />}>
          <RelatedProductsSection
            currentProductId={product.id}
            categoryId={product.categoryId}
            parentCategoryId={product.category?.parentId ?? null}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

async function RelatedProductsSection({
  currentProductId,
  categoryId,
  parentCategoryId,
}: {
  currentProductId: string;
  categoryId: string | null;
  parentCategoryId: string | null;
}) {
  const ancestorId = parentCategoryId ?? categoryId;

  const siblingCategoryIds = ancestorId
    ? (
        await db.category.findMany({
          where: {
            OR: [{ id: ancestorId }, { parentId: ancestorId }],
            isActive: true,
          },
          select: { id: true },
        })
      ).map((c) => c.id)
    : categoryId
    ? [categoryId]
    : [];

  if (siblingCategoryIds.length === 0) return null;

  const pool = await db.product.findMany({
    where: {
      categoryId: { in: siblingCategoryIds },
      id: { not: currentProductId },
      isActive: true,
      ...storefrontHasImageWhere,
    },
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      stock: true,
      shortDescription: true,
      description: true,
      productVariants: true, colors: true, sizes: true, productImages: true,
      isPremiumGiftBox: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: true,
      isTopRated: true,
      categoryId: true,
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
    take: 15,
    orderBy: { updatedAt: "desc" },
  });

  if (pool.length === 0) return null;

  // Fisher-Yates shuffle, pick 4
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const related = shuffled.slice(0, 5);

  return (
    <section className="mt-20 space-y-8 border-t border-brand-border pt-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F1720]">You May Also Like</h2>
        <Link href="/categories" className="text-sm font-bold text-[#A7066A] hover:underline">
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {related.map((item: any) => {
          let images: string[] = [];
          if (Array.isArray(item.productImages)) {
            const leadImageObj = item.productImages.find(
              (img: any) => img && typeof img === 'object' && img.isMain === true
            );
            const leadImageUrl = leadImageObj?.url || leadImageObj?.src;

            const allUrls = item.productImages
              .map((image: any) => {
                if (typeof image === "string") return image;
                if (image && typeof image === "object" && "url" in image) return image.url;
                return null;
              })
              .filter((v: any): v is string => Boolean(v));

            if (leadImageUrl && typeof leadImageUrl === "string") {
              images = [leadImageUrl, ...allUrls.filter(url => url !== leadImageUrl)];
            } else {
              images = allUrls;
            }
          }

          const hasDiscount = (typeof item.salePrice === "number" && item.salePrice < item.price) || Boolean(item.discount);
          const finalPrice = hasDiscount && item.salePrice !== null ? item.salePrice : item.price;

          const productForCard = {
            id: item.id,
            name: item.name,
            slug: item.name.toLowerCase().replace(/\s+/g, "-"),
            description: item.description || "",
            shortDescription: item.shortDescription || "",
            price: finalPrice,
            originalPrice: hasDiscount ? item.price : undefined,
            images,
            categoryId: item.categoryId || "",
            occasionIds: [],
            tags: [],
            rating: item.reviews?.length > 0 
              ? item.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / item.reviews.length 
              : 0,
            reviewCount: item.reviews?.length || 0,
            inStock: item.stock > 0,
            isPremiumGiftBox: item.isPremiumGiftBox,
            itemsInside: item.itemsInside,
            isBestSeller: item.isBestSeller,
            isNewArrival: item.isNewArrival,
            isTrending: item.isTrending,
            isTopRated: item.isTopRated,
            productVariants: item.productVariants,
            sizes: item.sizes,
            colors: item.colors,
            isFeatured: false,
            capacityUnits: 5,
          };

          return (
            <ProductCard key={item.id} product={productForCard as any} />
          );
        })}
      </div>
    </section>
  );
}

function RelatedProductsSkeleton() {
  return (
    <section className="mt-20 space-y-8 border-t border-brand-border pt-16">
      <Skeleton className="h-8 w-56 bg-[#F3EDF1]" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-brand-border bg-white overflow-hidden">
            <Skeleton className="aspect-square bg-[#F3EDF1]" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-5/6 bg-[#F3EDF1]" />
              <Skeleton className="h-4 w-1/2 bg-[#F3EDF1]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
