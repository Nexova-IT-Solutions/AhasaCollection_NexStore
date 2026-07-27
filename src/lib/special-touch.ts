import type { Product } from "@/types";

export type SpecialTouchProduct = Product & {
  stock: number;
  specialTouchOrder: number;
};

type SpecialTouchSource = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  categoryId: string | null;
  productImages: unknown;
  specialTouchOrder: number;
};

function extractImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return null;
      const candidate = item as { url?: unknown };
      return typeof candidate.url === "string" && candidate.url.length > 0 ? candidate.url : null;
    })
    .filter((item): item is string => Boolean(item));
}

function buildSpecialTouchProduct(product: SpecialTouchSource): SpecialTouchProduct {
  const images = extractImageUrls(product.productImages);

  return {
    id: product.id,
    name: product.name,
    slug: product.id,
    description: product.description ?? "",
    shortDescription: product.description ?? "",
    price: product.price,
    salePrice: product.salePrice ?? undefined,
    stock: product.stock,
    images: images.length > 0 ? images : ["/logo/logo.png"],
    categoryId: product.categoryId ?? "",
    occasionIds: [],
    tags: [],
    rating: undefined,
    reviewCount: undefined,
    inStock: product.stock > 0,
    isBestSeller: false,
    isNew: false,
    isFeatured: false,
    isNewArrival: false,
    isTrending: false,
    isTopRated: false,
    showInDiscountSection: false,
    recipientIds: [],
    variants: [],
    capacityUnits: undefined,
    specialTouchOrder: product.specialTouchOrder,
  };
}

export function normalizeSpecialTouchProducts(products: SpecialTouchSource[]): SpecialTouchProduct[] {
  return products.map(buildSpecialTouchProduct);
}