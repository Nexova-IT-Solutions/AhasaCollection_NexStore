"use client";

import { memo, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, Heart, Star, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { useCartStore } from "@/store";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { isGiftBoxEffectivelyOutOfStock } from "@/lib/gift-box-stock";
import { VariantSelectorModal } from "@/components/products/VariantSelectorModal";
import { type VariantSelection, type VariantProductPayload, parseProductVariants } from "@/types/variant";
import { useCurrency } from "@/components/CurrencyProvider";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact" | "horizontal";
  showAddToCart?: boolean;
  showQuickView?: boolean;
  activeBadge?: "trending" | "new" | "bestseller" | "toprated" | "discount" | "chocolate" | "softtoy";
  hideBadges?: boolean;
  priority?: boolean;
}

function ProductCardComponent({
  product,
  variant = "default",
  showAddToCart = true,
  showQuickView = false,
  ctaMode = "default",
  activeBadge,
  hideBadges = false,
  priority = false,
}: ProductCardProps) {
  const { addItem, addToCart, openCart } = useCartStore();

  const isParentOutOfStock = !product.inStock;
  const isChildOutOfStock = product.isPremiumGiftBox && isGiftBoxEffectivelyOutOfStock(product.itemsInside ?? []);
  const isOutOfStock = isParentOutOfStock || isChildOutOfStock;

  const discountFromPrices = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const discount = discountFromPrices;
  const hasDiscount = discount > 0 && Boolean(product.originalPrice);
  
  const allBadges = [];
  if (hasDiscount) allBadges.push({ type: "discount", label: `-${discount}%`, className: "bg-[#FF4757] text-white border-0 shadow-sm" });
  if (product.isNew || product.isNewArrival) allBadges.push({ type: "new", label: "New", className: "bg-[#A7066A] text-white border-0 shadow-sm" });
  if (product.isTrending) allBadges.push({ type: "trending", label: "Trending", className: "bg-[#F78C2D] text-white border-0 shadow-sm" });
  if (product.isBestSeller) allBadges.push({ type: "bestseller", label: "Bestseller", className: "bg-[#FF6B9D] text-white border-0 shadow-sm" });
  if (product.isTopRated) allBadges.push({ type: "toprated", label: "Top Rated", className: "bg-[#FFD93D] text-[#1F1720] border-0 shadow-sm" });
  if (product.showInChocolateSection) allBadges.push({ type: "chocolate", label: "Chocolate", className: "bg-amber-600 text-white border-0 shadow-sm" });
  if (product.showInSoftToysSection) allBadges.push({ type: "softtoy", label: "Soft Toy", className: "bg-purple-600 text-white border-0 shadow-sm" });

  const displayBadges = hideBadges ? [] : activeBadge 
    ? allBadges.filter(b => b.type === activeBadge) 
    : allBadges;

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // 1. Hydration Guard
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 1. Debug hook
  useEffect(() => {
    console.log(`[DEBUG] Product: ${product.name}`, {
      variants: product.productVariants,
      colors: product.colors,
      sizes: product.sizes,
      type: typeof product.productVariants
    });
  }, [product]);

  // Fallback Normalizer to ensure we always have an array
  const normalizeToArray = (field: any): any[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      const trimmed = field.trim();
      if (trimmed === '' || trimmed === '[]' || trimmed === 'null') return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        // Fallback for strings like "Red|Blue" or "Red,Blue"
        return trimmed.split(/[,|]/).filter(Boolean);
      }
    }
    // If it's a standalone object, wrap it in an array
    if (typeof field === 'object') return [field];
    return [];
  };

  // 2. Presence-only boolean logic using normalized data
  const hasVariants = useMemo(() => {
    const v = normalizeToArray(product.productVariants);
    const c = normalizeToArray(product.colors);
    const s = normalizeToArray(product.sizes);
    
    return v.length > 0 || c.length > 0 || s.length > 0;
  }, [product]);

  const isAmbiguous = useMemo(() => {
    const v = product.productVariants;
    // Ambiguous if it's an object but NOT an array (and our normalizer wrapped it)
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }, [product.productVariants]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      setIsVariantModalOpen(true);
    } else {
      addItem(product);
      openCart();
    }
  };

  const handleVariantConfirm = (selection: VariantSelection) => {
    console.log("[ProductCard:handleVariantConfirm] Confirming variant selection:", selection);
    addToCart(product, selection, 1);
    openCart();
    setIsVariantModalOpen(false);
  };

  const variantPayload: VariantProductPayload | null = isVariantModalOpen ? {
    id: product.id,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.inStock ? 999 : 0,
    sizes: product.sizes || [],
    colors: product.colors || [],
    productVariants: parseProductVariants(product.productVariants),
    image: product.images?.[0],
  } : null;

  const { formatPrice } = useCurrency();

  const fallbackImage = "https://kvglredjnqdqqbmmhivi.supabase.co/storage/v1/object/public/giftbox/products/placeholder.jpg";
  const coverImage = product.images?.[0] || fallbackImage;

  if (variant === "horizontal") {
    return (
      <Link
        href={`/products/${product.id}`}
        className="flex gap-4 p-3 bg-white rounded-xl border border-brand-border hover:shadow-md transition-all group w-full"
      >
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#FCEAF4]">
          <Image
            src={coverImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priority}
            className={cn("object-cover group-hover:scale-105 transition-transform duration-300", isOutOfStock && "opacity-60")}
          />
          <div className="absolute top-1 left-1 flex flex-col gap-1 items-start z-10">
            {isOutOfStock && (
              <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-bold uppercase">OOS</Badge>
            )}
            {!isOutOfStock && displayBadges.slice(0, 1).map((b, i) => (
              <Badge key={i} className={cn("text-[8px] px-1.5 py-0 font-bold uppercase", b.className)}>{b.label}</Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[#1F1720] truncate group-hover:text-[#A7066A] transition-colors">
            {product.name}
          </h3>
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
            {product.shortDescription || product.description?.substring(0, 100)}
          </p>
          {typeof product.rating === "number" && product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-[#FFD93D] fill-[#FFD93D]" />
              <span className="text-[10px] text-[#6B5A64]">
                {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-semibold text-[#A7066A]">{formatPrice(product.price)}</span>
            {hasDiscount && product.originalPrice && (
              <span className="text-sm text-[#6B5A64] line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div 
      className={cn("group h-full flex flex-col bg-white rounded-2xl border border-brand-border hover:shadow-lg transition-all overflow-hidden w-full")}
      suppressHydrationWarning
    >
      <Link href={`/products/${product.id}`} className="w-full">
        <div className="relative aspect-square bg-[#FCEAF4] overflow-hidden w-full">
          <Image
            src={coverImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            className={cn("object-cover group-hover:scale-105 transition-transform duration-500", isOutOfStock && "opacity-60")}
          />
          
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
            {isOutOfStock && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-bold uppercase">Out of Stock</Badge>
            )}
            {!isOutOfStock && displayBadges.map((b, i) => (
              <Badge key={i} className={cn("text-[10px] px-2 py-0.5 font-bold uppercase", b.className)}>{b.label}</Badge>
            ))}
          </div>

          <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-[#A7066A]">
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </Link>

      <div className={cn("p-3 sm:p-4 flex-1 flex flex-col w-full")} suppressHydrationWarning>
        {/* Content Area (Grows to fill space) */}
        <div className="flex-1 flex flex-col">
          <Link href={`/products/${product.id}`} className="w-full">
            <h3 className="font-semibold text-[#1F1720] group-hover:text-[#A7066A] transition-colors line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.shortDescription || product.description?.substring(0, 150)}
          </p>
          
          {typeof product.rating === "number" && product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-2 h-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.round(product.rating!)
                        ? "text-[#FFD93D] fill-[#FFD93D]"
                        : "text-[#EBC9DB]"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-[#6B5A64]">({product.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Variant Indicator */}
        <div className="flex items-center min-h-[24px] mb-2 px-1 mt-auto">
          {!isHydrated ? (
            // SSR/Initial payload placeholder preventing layout shift
            <span className="text-[11px] text-transparent select-none font-normal">
              Loading Options...
            </span>
          ) : isAmbiguous ? (
             <span className="text-[11px] text-red-500 font-bold">
              DEBUG: CHECK VARIANTS
            </span>
          ) : hasVariants ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20">
              Multiple Options Available
            </span>
          ) : (
            <span className="text-[11px] text-neutral-400 font-normal">
              Standard Pack
            </span>
          )}
        </div>

        {/* Footer Area (Pushed to bottom) */}
        <div className={cn("flex items-center justify-between pt-2 gap-2 w-full")} suppressHydrationWarning>
          <div className="min-w-0 flex-shrink">
            <span className="text-sm sm:text-lg font-bold text-[#A7066A] block truncate">{formatPrice(product.price)}</span>
            {hasDiscount && product.originalPrice && (
              <span className="text-[9px] sm:text-sm text-[#6B5A64] line-through block truncate">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {showAddToCart && (
              ctaMode === "byob" ? (
                <Button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  size="sm"
                  className="rounded-full bg-[#A7066A] px-2 sm:px-4 text-[9px] sm:text-xs text-white hover:bg-[#8B0557]"
                >
                  <Plus className="h-3 w-3 sm:mr-1" />
                  <span className="hidden xs:inline">{!isOutOfStock ? "Add" : "OOS"}</span>
                </Button>
              ) : !isOutOfStock ? (
                <Button
                  onClick={handleAddToCart}
                  size="sm"
                  className="rounded-full bg-[#A7066A] px-2 sm:px-4 text-[9px] sm:text-xs text-white hover:bg-[#8B0557]"
                >
                  <ShoppingCart className="h-3 w-3 sm:mr-1" />
                  <span className="hidden xs:inline">Add</span>
                </Button>
              ) : (
                <Button
                  disabled
                  variant="secondary"
                  size="sm"
                  className="rounded-full px-2 sm:px-4 text-[9px] sm:text-xs"
                >
                  OOS
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {isVariantModalOpen && variantPayload && (
        <div onClick={(e) => e.stopPropagation()}>
          <VariantSelectorModal
            open={isVariantModalOpen}
            onOpenChange={setIsVariantModalOpen}
            product={variantPayload}
            onConfirm={handleVariantConfirm}
            enableServerValidation={false}
          />
        </div>
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);
