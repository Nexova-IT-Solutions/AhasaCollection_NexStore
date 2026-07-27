"use client";

import { useEffect, useState } from "react";
import { PremiumBoxCard, SectionHeading, SectionSkeleton } from "@/components/giftbox";

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
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isTopRated?: boolean;
  showInChocolateSection?: boolean;
  showInSoftToysSection?: boolean;
  discount?: any;
  itemsInside?: any[];
}

export function PremiumGiftBoxesSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products/gift-boxes");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch premium gift boxes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
        <SectionSkeleton />
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto overflow-hidden">
      <SectionHeading
        title="Premium Gift Boxes"
        subtitle="Exquisite collections curated for life's most special moments."
        viewAllHref="/category/gift-boxes"
      />

      <div className="mt-8 grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {products.map((product) => {
          let images: string[] = [];
          if (product.productImages) {
            const productImagesArr = Array.isArray(product.productImages)
              ? product.productImages
              : [product.productImages];

            const leadImageObj = productImagesArr.find(
              (img: any) => img && typeof img === 'object' && img.isMain === true
            );
            const leadImageUrl = leadImageObj?.url || leadImageObj?.src;

            const allUrls = productImagesArr
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

          return (
            <PremiumBoxCard
              key={product.id}
              id={product.id}
              name={product.name}
              description={product.description}
              price={product.price}
              images={images}
              inStock={product.stock > 0}
              includedItems={product.itemsInside?.map((entry: any) => entry.item?.name).filter(Boolean) || []}
              isNewArrival={product.isNewArrival}
              isTrending={product.isTrending}
              isBestSeller={product.isBestSeller}
              isTopRated={product.isTopRated}
              showInChocolateSection={product.showInChocolateSection}
              showInSoftToysSection={product.showInSoftToysSection}
            />
          );
        })}
      </div>
    </section>
  );
}
