"use client";

import { useEffect, useState } from "react";
import { ProductCard, SectionHeading, SectionSkeleton } from "@/components/giftbox";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  categoryId: string | null;
  productImages: any;
  isPremiumGiftBox: boolean;
  discount?: any;
  itemsInside?: any[];
}

export function DiscountedItemsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products/discounted");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch discounted items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto bg-gradient-to-r from-red-50/30 to-transparent rounded-3xl">
        <SectionSkeleton />
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto bg-gradient-to-r from-red-50/30 to-transparent rounded-3xl">
      <SectionHeading
        title="Special Discounts"
        subtitle="Limited time offers on selected items"
        showViewAll
        viewAllLink="/categories"
      />
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-start">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={mapProductForCard(product)}
          />
        ))}
      </div>
    </section>
  );
}

function mapProductForCard(product: Product) {
  let images: string[] = [];
  if (Array.isArray(product.productImages)) {
    const leadImageObj = product.productImages.find(
      (img: any) => img && typeof img === 'object' && img.isMain === true
    );
    const leadImageUrl = leadImageObj?.url || leadImageObj?.src;

    const allUrls = product.productImages
      .map((image: any) => {
        if (typeof image === "string") return image;
        if (image && typeof image === "object" && "url" in image && typeof image.url === "string") {
          return image.url;
        }
        if (image && typeof image === "object" && "src" in image && typeof image.src === "string") {
          return image.src;
        }
        return null;
      })
      .filter((value: any): value is string => Boolean(value));

    if (leadImageUrl && typeof leadImageUrl === "string") {
      images = [leadImageUrl, ...allUrls.filter(url => url !== leadImageUrl)];
    } else {
      images = allUrls;
    }
  }

  const hasDiscount = Boolean(product.discount) && typeof product.salePrice === "number" && product.salePrice < product.price;
  const finalPrice = hasDiscount && product.salePrice !== null ? product.salePrice : product.price;

  return {
    id: product.id,
    name: product.name,
    slug: product.name.toLowerCase().replace(/\s+/g, "-"),
    description: product.description || "",
    shortDescription: product.shortDescription || product.description || "",
    price: finalPrice,
    originalPrice: hasDiscount ? product.price : undefined,
    images,
    categoryId: product.categoryId || "",
    occasionIds: [],
    tags: [],
    rating: 4,
    reviewCount: 0,
    inStock: product.stock > 0,
    isPremiumGiftBox: product.isPremiumGiftBox,
    itemsInside: product.itemsInside,
    isBestSeller: false,
    isFeatured: false,
    capacityUnits: 5,
  };
}
