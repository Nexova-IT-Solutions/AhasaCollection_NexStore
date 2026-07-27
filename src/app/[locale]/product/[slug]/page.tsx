import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ProductDetailClient } from "./product-detail-client";
import { CustomerReviewsSection } from "@/components/reviews/CustomerReviewsSection";

const storefrontHasImageWhere: Prisma.ProductWhereInput = {
  NOT: {
    productImages: {
      equals: [],
    },
  },
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Keep metadata query minimal so it doesn't add avoidable latency.
  const product = await db.product.findUnique({
    where: { id: slug },
    select: {
      name: true,
      description: true,
      shortDescription: true,
      productImages: true,
    },
  });

  if (!product) {
    return {
      title: "Product Not Found | Giftbox Lanka",
    };
  }

  const image = parseImages(product.productImages)[0]?.url;

  return {
    title: `${product.name} | Giftbox Lanka`,
    description: product.description?.slice(0, 160) || product.shortDescription?.slice(0, 160) || "Discover curated gifts at Giftbox Lanka.",
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) || product.shortDescription?.slice(0, 160) || "Discover curated gifts at Giftbox Lanka.",
      images: image ? [image] : undefined,
    },
  };
}

type DbVariant = {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  image?: string;
};

type DbImage = {
  url: string;
  isMain: boolean;
  color?: string;
};

function parseImages(value: unknown): DbImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const image = item as { url?: unknown; isMain?: unknown; color?: unknown };
      if (typeof image.url !== "string" || !image.url) return null;
      return { 
        url: image.url, 
        isMain: typeof image.isMain === "boolean" ? image.isMain : false,
        color: typeof image.color === "string" ? image.color : undefined
      };
    })
    .filter((item): item is DbImage => item !== null);
}

function parseProductImages(imagesField: any): string {
  if (!imagesField) return "/logo/logo.png";
  
  try {
    let parsed = imagesField;
    if (typeof imagesField === "string") {
      const trimmed = imagesField.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        parsed = JSON.parse(trimmed);
      } else {
        return trimmed || "/logo/logo.png";
      }
    }
    
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return "/logo/logo.png";
      const first = parsed[0];
      if (typeof first === "string") return first || "/logo/logo.png";
      if (first && typeof first === "object" && typeof first.url === "string") {
        return first.url || "/logo/logo.png";
      }
    } else if (parsed && typeof parsed === "object") {
      if (typeof parsed.url === "string") return parsed.url || "/logo/logo.png";
    }
  } catch (error) {
    console.error("Error parsing product images JSON:", error);
  }
  
  return "/logo/logo.png";
}

function parseVariants(value: unknown): DbVariant[] {
  if (!Array.isArray(value)) return [];

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const variant = item as { size?: unknown; color?: unknown; price?: unknown; stock?: unknown; image?: unknown; imageUrl?: unknown };
      const size = typeof variant.size === "string" ? variant.size : "";
      const color = typeof variant.color === "string" ? variant.color : "";
      const name = [size, color].filter(Boolean).join(" / ") || "Default";
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
    .filter((item): item is DbVariant => Boolean(item));

  const uniqueById = new Map<string, DbVariant>();
  parsed.forEach((item) => {
    if (!uniqueById.has(item.id)) uniqueById.set(item.id, item);
  });
  return Array.from(uniqueById.values());
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = (await (db.product as any).findFirst({
    where: {
      id: slug,
      isActive: true,
      ...storefrontHasImageWhere,
    },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
          parentId: true,
        },
      },
      occasions: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      discount: true,
      itemsInside: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              stock: true,
              productImages: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { itemId: "asc" }],
      },
    },
  })) as
    | ({
        id: string;
        name: string;
        description: string | null;
        shortDescription: string | null;
        price: number;
        salePrice: number | null;
        discount: unknown;
        stock: number;
        isPremiumGiftBox: boolean;
        sizes: string[];
        colors: string[];
        productImages: unknown;
        productVariants: unknown;
        categoryId: string | null;
        category: { name: string; slug: string; parentId: string | null } | null;
        occasions: { id: string; name: string; slug: string }[];
        itemsInside: Array<{ 
          itemId: string; 
          quantity: number; 
          item: { id: string; name: string; slug: string; stock: number; productImages: unknown } 
        }>;
      }
    | null);

  if (!product) {
    notFound();
  }

  const images = parseImages(product.productImages);
  const variants = parseVariants(product.productVariants);

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
            discount: product.discount as any,
            stock: product.stock,
            sizes: product.sizes,
            colors: product.colors,
            images,
            variants,
            category: product.category,
            occasions: product.occasions,
            isPremiumGiftBox: product.isPremiumGiftBox,
            averageRating: 0, // Fallback if slug page has no direct ratings included
            reviewCount: 0,
            itemsInside: (product.itemsInside ?? []).map((entry) => ({
              itemId: entry.itemId,
              itemName: entry.item.name,
              quantity: entry.quantity,
              itemStock: entry.item.stock,
              itemSlug: entry.item.slug,
              mainImageUrl: parseProductImages(entry.item.productImages),
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
  // Resolve the parent scope — if this category has a parent, use that
  // so we include sibling categories (same product family).
  const ancestorId = parentCategoryId ?? categoryId;

  // Fetch all sibling category IDs under the same parent
  const siblingCategoryIds = ancestorId
    ? (await db.category.findMany({
        where: {
          OR: [
            { id: ancestorId },              // the parent itself
            { parentId: ancestorId },         // all children of the parent
          ],
          isActive: true,
        },
        select: { id: true },
      })).map((c) => c.id)
    : categoryId
    ? [categoryId]
    : [];

  if (siblingCategoryIds.length === 0) return null;

  // Fetch a larger pool (12) then shuffle client-side for variety
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
      stock: true,
      productImages: true,
      isPremiumGiftBox: true,
      itemsInside: {
        select: {
          quantity: true,
          item: { select: { stock: true } },
        },
      },
    },
    take: 12,
    orderBy: { updatedAt: "desc" },
  });

  if (pool.length === 0) return null;

  // Fisher-Yates shuffle then slice top 4
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const related = shuffled.slice(0, 4);

  return (
    <section className="mt-20 space-y-8 border-t border-brand-border pt-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F1720]">You May Also Like</h2>
        <Link href="/categories" className="text-sm font-bold text-[#A7066A] hover:underline">View All</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {related.map((item) => {
          const images = parseImages(item.productImages);
          const image = images.find((img) => img.isMain)?.url || images[0]?.url || "/logo/logo.png";
          const isOutOfStock = item.isPremiumGiftBox
            ? (item.itemsInside ?? []).some((bi) => bi.item.stock < bi.quantity)
            : item.stock <= 0;

          return (
            <article key={item.id} className="group rounded-2xl border border-brand-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <Link href={`/products/${item.id}`}>
                <div className="relative aspect-square bg-[#FCEAF4] overflow-hidden">
                  <Image
                    src={image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full">Sold Out</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-3 space-y-1">
                <Link href={`/products/${item.id}`} className="line-clamp-2 text-sm font-semibold text-[#1F1720] hover:text-[#A7066A] leading-snug">
                  {item.name}
                </Link>
                <p className="text-sm font-bold text-[#A7066A]">LKR {item.price.toLocaleString()}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RelatedProductsSkeleton() {
  return (
    <section className="mt-14 space-y-5 border-t border-brand-border pt-10">
      <Skeleton className="h-8 w-56 bg-[#F3EDF1]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
