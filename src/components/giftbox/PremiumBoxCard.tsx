"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store";
import { useCurrency } from "@/components/CurrencyProvider";

type PremiumBoxCardProps = {
  id: string;
  name: string;
  shortDescription?: string | null;
  price: number;
  images: string[];
  inStock: boolean;
};

export function PremiumBoxCard({
  id,
  name,
  shortDescription,
  price,
  images,
  inStock,
}: PremiumBoxCardProps) {
  const { addItem, openCart } = useCartStore();
  const { formatPrice } = useCurrency();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      description: "",
      shortDescription: shortDescription || "",
      price,
      images,
      categoryId: "",
      occasionIds: [],
      tags: [],
      rating: 4,
      reviewCount: 0,
      inStock,
      isPremiumGiftBox: true,
      isFeatured: false,
      capacityUnits: 5,
    });
    openCart();
  };

  const fallbackImage = "https://kvglredjnqdqqbmmhivi.supabase.co/storage/v1/object/public/giftbox/products/placeholder.jpg";
  const coverImage = images[0] || fallbackImage;

  return (
    <div className="group flex flex-col h-full overflow-hidden rounded-2xl border border-[#E9D8E2] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={`/products/${id}`} className="w-full">
        <div className="relative aspect-square overflow-hidden bg-[#FCEAF4]">
          <Image
            src={coverImage}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              !inStock && "opacity-60"
            )}
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5 items-start z-10">
            <Badge className="border-0 bg-[#A7066A] text-white shadow-sm uppercase text-[10px] font-bold">
              Premium Box
            </Badge>
          </div>
          {!inStock && (
            <div className="absolute right-3 top-3 z-10">
              <Badge className="border-0 bg-red-600 text-white shadow-sm uppercase text-[10px] font-bold">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 flex flex-col p-4">
        <Link href={`/products/${id}`} className="w-full">
          <h3 className="line-clamp-1 font-semibold text-[#1F1720] group-hover:text-[#A7066A] transition-colors">
            {name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-[#6B5A64]">
          {shortDescription || "Curated gift box with carefully selected premium items."}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 gap-2 w-full">
          <span className="text-sm sm:text-lg font-bold text-[#A7066A]">
            {formatPrice(price)}
          </span>
          {inStock ? (
            <Button
              onClick={handleAddToCart}
              size="sm"
              className="rounded-full bg-[#A7066A] px-3 text-white hover:bg-[#8B0557]"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add
            </Button>
          ) : (
            <Button
              disabled
              variant="secondary"
              size="sm"
              className="rounded-full px-3"
            >
              Out of Stock
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
