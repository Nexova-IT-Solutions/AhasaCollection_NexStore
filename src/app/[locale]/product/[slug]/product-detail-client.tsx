"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, Star, ChevronRight, CreditCard, Building2, Banknote, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCartStore } from "@/store";
import { StarRating } from "@/components/reviews/StarRating";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

type ProductImage = {
  url: string;
  isMain?: boolean;
};

type ProductVariant = {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  image?: string;
};

type DetailProduct = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number | null;
  discount?: {
    id: string;
    name: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
    isActive: boolean;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
  } | null;
  stock: number;
  isPremiumGiftBox: boolean;
  sizes: string[];
  colors: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  category: { name: string; slug: string } | null;
  occasions: { id: string; name: string; slug: string }[];
  averageRating: number;
  reviewCount: number;
  itemsInside: { 
    itemId: string; 
    itemName: string; 
    quantity: number;
    itemStock: number;
    itemSlug?: string;
    mainImageUrl?: string;
  }[];
};

function getActiveDiscountForValue(
  price: number,
  product: {
    price: number;
    salePrice?: number | null;
    discount?: {
      value: number;
      type: "PERCENTAGE" | "FIXED";
      isActive: boolean;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
    } | null;
  }
) {
  // 1. Check if there's an active discount relation
  let isDiscountActive = false;
  if (product.discount && product.discount.isActive) {
    const now = new Date();
    const startsAt = product.discount.startsAt ? new Date(product.discount.startsAt) : null;
    const endsAt = product.discount.endsAt ? new Date(product.discount.endsAt) : null;
    
    const isStarted = !startsAt || startsAt <= now;
    const isNotEnded = !endsAt || endsAt >= now;
    
    if (isStarted && isNotEnded) {
      isDiscountActive = true;
    }
  }

  // 2. Calculate discounted price and details from relation
  if (isDiscountActive && product.discount) {
    const val = product.discount.value;
    if (product.discount.type === "PERCENTAGE") {
      const discountedPrice = price * (1 - val / 100);
      const savedAmount = price - discountedPrice;
      return {
        hasDiscount: true,
        originalPrice: price,
        discountedPrice: discountedPrice,
        discountPercentage: Math.round(val),
        savedAmount: savedAmount,
      };
    } else if (product.discount.type === "FIXED") {
      const discountedPrice = Math.max(0, price - val);
      const discountPercentage = Math.round((val / price) * 100);
      return {
        hasDiscount: true,
        originalPrice: price,
        discountedPrice: discountedPrice,
        discountPercentage: discountPercentage,
        savedAmount: val,
      };
    }
  }

  // 3. Fallback to salePrice if defined and less than price
  if (product.salePrice && product.salePrice < product.price) {
    const baseOriginal = product.price;
    const baseDiscounted = product.salePrice;
    const discountRatio = baseDiscounted / baseOriginal;
    const discountedPrice = price * discountRatio;
    const savedAmount = price - discountedPrice;
    const discountPercentage = Math.round(((price - discountedPrice) / price) * 100);
    return {
      hasDiscount: true,
      originalPrice: price,
      discountedPrice: discountedPrice,
      discountPercentage: discountPercentage,
      savedAmount: savedAmount,
    };
  }

  // No active discount
  return {
    hasDiscount: false,
    originalPrice: price,
    discountedPrice: price,
    discountPercentage: 0,
    savedAmount: 0,
  };
}

function toCartProduct(product: DetailProduct, selectedVariant?: any): Product {
  const discountInfo = getActiveDiscountForValue(Number(product.price), product);
  
  let price = Number(discountInfo.discountedPrice);
  let originalPrice: number | undefined = discountInfo.hasDiscount
    ? Number(discountInfo.originalPrice)
    : undefined;

  if (selectedVariant) {
    const variantDiscount = getActiveDiscountForValue(Number(selectedVariant.price), product);
    price = Number(variantDiscount.discountedPrice);
    originalPrice = variantDiscount.hasDiscount
      ? Number(variantDiscount.originalPrice)
      : Number(selectedVariant.price);
  }

  return {
    id: product.id,
    slug: product.id,
    name: product.name,
    description: product.description || "",
    shortDescription: product.shortDescription || product.description?.slice(0, 120) || "",
    price,
    originalPrice,
    images: product.images.map((image) => image.url),
    categoryId: product.category?.slug || "uncategorized",
    occasionIds: product.occasions.map((occasion) => occasion.id),
    tags: [],
    inStock: !(product.stock <= 0 || (product.isPremiumGiftBox && (product.itemsInside ?? []).some(item => item.itemStock < item.quantity))),
    sizes: product.sizes,
    colors: product.colors,
    variants: product.variants.map((variant) => {
      const variantDiscount = getActiveDiscountForValue(Number(variant.price), product);
      return {
        id: variant.id,
        name: variant.name,
        price: Number(variantDiscount.discountedPrice),
        originalPrice: variantDiscount.hasDiscount ? Number(variantDiscount.originalPrice) : Number(variant.price),
        inStock: variant.inStock,
      };
    }),
  } as unknown as Product;
}

const PAYMENT_METHODS = [
  {
    id: "mintpay",
    title: "Mintpay",
    subtitle: "Split into 3 installments",
    icon: Wallet,
    badge: null,
  },
  {
    id: "card",
    title: "Card Payment",
    subtitle: "Visa, Mastercard, AMEX",
    icon: CreditCard,
    badge: "+LKR 50 fee",
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    subtitle: "Pay when you receive it",
    icon: Banknote,
    badge: null,
  },
];


export function ProductDetailClient({ product, reviews }: { product: DetailProduct; reviews?: React.ReactNode }) {
  const { data: session, status } = useSession();
  const t = useTranslations("Common");
  const { toast } = useToast();
  const mainImageIndex = Math.max(
    0,
    product.images.findIndex((image) => image.isMain)
  );

  // 1. Define the lead visual and mapping before hooks
  const leadVisualUrl = product.images[mainImageIndex]?.url || product.images[0]?.url || "/logo/logo.png";
  
  const colorToImageMap: Record<string, string | undefined> = {
    "Orange": product.images[0]?.url, 
    "Green": product.images[1]?.url,  
    "Red": product.images[2]?.url,
    "Black": product.images[3]?.url,
  };

  // 2. Reverse lookup the color that matches the lead visual image URL
  const defaultColorFromImage = Object.keys(colorToImageMap).find(
    (color) => colorToImageMap[color] === leadVisualUrl
  );

  const firstVariant = product.variants[0];
  const initialSize = firstVariant?.name.split(' / ')[0] || product.sizes[0] || "";
  const initialColor = defaultColorFromImage || firstVariant?.name.split(' / ')[1] || product.colors[0] || "";

  const [mainImage, setMainImage] = useState(leadVisualUrl);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [innerItemsLoading, setInnerItemsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setInnerItemsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const cleanDescription = product.description 
    ? product.description
        .replace(/\\n/g, "\n") // Fix literal \n
        .replace(/\\"/g, '"')  // Fix escaped quotes
        .replace(/^"|"$/g, "") // Remove wrapping quotes if double-stringified
    : "";

  const { addItem, openCart } = useCartStore();

  useEffect(() => {
    console.log('DEBUG: All Variants:', product.variants);
    console.log('DEBUG: Product Images:', product.images);
  }, [product.variants, product.images]);

  const updateMainImage = (size: string, color: string) => {
    console.log('DEBUG: Updating image for Size:', size, 'Color:', color);

    // --- TEMPORARY WORKAROUND ---
    // Hardcoded map for colors to specific image URLs from the existing gallery
    // Indices are examples - adjust based on your actual gallery order
    const colorToImageMap: Record<string, string | undefined> = {
      "Orange": product.images[0]?.url, 
      "Green": product.images[1]?.url,  
      "Red": product.images[2]?.url,
      "Black": product.images[3]?.url,
    };

    const mappedUrl = color && colorToImageMap[color];
    if (mappedUrl) {
      console.log('DEBUG: Using gallery-index map for color:', color, 'URL:', mappedUrl);
      setMainImage(mappedUrl);
      return;
    }

    // Dynamic workaround: Search for color name in the actual URL strings
    const dynamicMatch = product.images.find(img => 
      img.url.toLowerCase().includes(color.toLowerCase())
    );
    if (dynamicMatch) {
      console.log('DEBUG: Found dynamic URL match for:', color);
      setMainImage(dynamicMatch.url);
      return;
    }
    // --- END WORKAROUND ---

    // 1. Try to find a variant that matches exactly (case-insensitive)
    const matchingVariant = product.variants.find((v) => {
      const nameParts = v.name.toLowerCase().split(' / ');
      const sizeMatch = size ? nameParts.includes(size.toLowerCase()) : true;
      const colorMatch = color ? nameParts.includes(color.toLowerCase()) : true;
      return sizeMatch && colorMatch;
    });

    console.log('DEBUG: Matched Variant:', matchingVariant);

    // 2. If variant has an image, use it
    const variantImageUrl = matchingVariant?.image;
    if (variantImageUrl) {
      console.log('DEBUG: Setting image from variant:', variantImageUrl);
      setMainImage(variantImageUrl);
      return;
    }

    // 3. Fallback: Try to find an image that is tagged with this color
    if (color) {
      const colorImage = product.images.find((img: any) => 
        img.color?.toLowerCase() === color.toLowerCase()
      );
      if (colorImage) {
        console.log('DEBUG: Setting image from color tag fallback:', colorImage.url);
        setMainImage(colorImage.url);
        return;
      }
    }

    // 4. Default back to the product's primary image
    console.log('DEBUG: Falling back to default main image');
    setMainImage(product.images[mainImageIndex]?.url || "/logo/logo.png");
  };

  const handleSizeSelect = (size: string) => {
    console.log('DEBUG: handleSizeSelect clicked:', size);
    setSelectedSize(size);
    updateMainImage(size, selectedColor);
  };

  const handleColorSelect = (color: string) => {
    console.log('DEBUG: handleColorSelect clicked:', color);
    setSelectedColor(color);
    updateMainImage(selectedSize, color);
  };

  useEffect(() => {
    if (typeof window === "undefined" || status === "loading") return;

    const userId = session?.user?.id;
    const storageKey = userId ? `recentlyViewed:${userId}` : "recentlyViewed:guest";

    const current = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]?.url || "/logo/logo.png",
    };

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];

      const unique = list.filter((item: any) => item && item.id !== current.id);
      const next = [current, ...unique].slice(0, 10);

      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      window.localStorage.setItem(storageKey, JSON.stringify([current]));
    }
  }, [product.id, product.images, product.name, product.price, session?.user?.id, status]);

  const filteredVariants = useMemo(() => {
    if (product.variants.length === 0) return [];

    return product.variants.filter((variant) => {
      const lower = variant.name.toLowerCase();
      const sizeMatch = selectedSize ? lower.includes(selectedSize.toLowerCase()) : true;
      const colorMatch = selectedColor ? lower.includes(selectedColor.toLowerCase()) : true;
      return sizeMatch && colorMatch;
    });
  }, [product.variants, selectedSize, selectedColor]);

  const selectedVariant = filteredVariants[0] || product.variants[0];
  const basePrice = selectedVariant?.price || product.price;
  const discountInfo = getActiveDiscountForValue(basePrice, product);
  
  // Dynamic stock check considering child items for Gift Boxes
  const isRegularOutOfStock = selectedVariant ? !selectedVariant.inStock : product.stock <= 0;
  const hasUnavailableChildItem = product.isPremiumGiftBox && (product.itemsInside?.some((boxItem) => {
    return boxItem.itemStock < boxItem.quantity;
  }) ?? false);
  const isOutOfStock = isRegularOutOfStock || hasUnavailableChildItem;

  const handleAddToCart = () => {
    const cartProduct = toCartProduct(product, selectedVariant);
    console.log("[PDP:handleAddToCart] Dispatching to cart:", {
      productName: cartProduct.name,
      quantity,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name
    });
    addItem(cartProduct, quantity, selectedVariant?.id, selectedVariant?.name);
    openCart();

    toast({
      title: t("addedToCart") || "Added to Cart!",
      description: `${quantity} x ${product.name} ${selectedVariant ? `(${selectedVariant.name})` : ""} has been added to your cart.`,
      variant: "default",
      className: "bg-white border-brand-border/60 text-[#1F1720]",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Balanced 50/50 grid for PDP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* LEFT COLUMN (7 columns): Gallery + Info Tabs */}
        <div className="flex flex-col gap-16">
          {/* Image Gallery Section */}
          <div className="flex flex-col-reverse md:flex-row gap-4 items-start">
            {/* Vertical Thumbnails Column */}
            {product.images.length > 1 && (
              <div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto w-full md:w-auto md:max-h-[600px] pb-2 md:pb-0 scrollbar-hide custom-scrollbar">
                {product.images.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    onClick={() => setMainImage(image.url)}
                    className={cn(
                      "relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200",
                      mainImage === image.url 
                        ? "border-[#A7066A] shadow-md ring-2 ring-pink-100" 
                        : "border-brand-border hover:border-pink-200"
                    )}
                  >
                    <Image src={image.url} alt={`${product.name} thumbnail ${index + 1}`} fill className="object-cover p-1" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Display Image */}
            <div className="flex-1 w-full relative aspect-[4/5] max-h-[400px] md:max-h-[550px] lg:max-h-[600px] rounded-3xl overflow-hidden border border-brand-border bg-white shadow-sm group mx-auto lg:mx-0 max-w-[500px] lg:max-w-none">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-contain p-4 md:p-6 transition-all duration-500 group-hover:scale-105"
                priority
              />
              {product.isPremiumGiftBox && (
                <Badge className="absolute top-6 left-6 bg-[#A7066A] text-white border-0 px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg">
                  Premium Box
                </Badge>
              )}
            </div>
          </div>

          {/* Full Width Tabs (Moved here to fill space) */}
          <div className="w-full">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="bg-transparent border-b border-brand-border w-full justify-start rounded-none h-auto p-0 mb-8">
                <TabsTrigger 
                  value="description" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#A7066A] data-[state=active]:bg-transparent px-8 py-4 text-lg font-bold"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger 
                  value="specifications" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#A7066A] data-[state=active]:bg-transparent px-8 py-4 text-lg font-bold"
                >
                  Specifications
                </TabsTrigger>
                {product.isPremiumGiftBox && (
                  <TabsTrigger 
                    value="contents" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#A7066A] data-[state=active]:bg-transparent px-8 py-4 text-lg font-bold"
                  >
                    What&apos;s Inside
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="reviews" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#A7066A] data-[state=active]:bg-transparent px-8 py-4 text-lg font-bold"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-8">
                <TabsContent value="description" className="mt-0">
                  <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none">
                    {mounted && (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                          h2: ({ ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                          h3: ({ ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                          p: ({ ...props }) => <p className="mb-4 leading-relaxed text-[#3A2B35]" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc ml-6 mb-4 space-y-2" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal ml-6 mb-4 space-y-2" {...props} />,
                          li: ({ ...props }) => <li className="mb-1" {...props} />,
                          strong: ({ ...props }) => <strong className="font-bold text-[#A7066A]" {...props} />,
                          blockquote: ({ ...props }) => <blockquote className="border-l-4 border-[#A7066A] pl-4 italic my-4" {...props} />,
                        }}
                      >
                        {cleanDescription}
                      </ReactMarkdown>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="specifications" className="mt-0">
                  <div className="max-w-2xl space-y-6">
                    <div className="grid grid-cols-2 py-4 border-b border-brand-border">
                      <span className="text-[#6B5A64] font-medium">Category</span>
                      <span className="text-[#1F1720] font-bold">{product.category?.name || "General"}</span>
                    </div>
                    <div className="grid grid-cols-2 py-4 border-b border-brand-border">
                      <span className="text-[#6B5A64] font-medium">Type</span>
                      <span className="text-[#1F1720] font-bold">{product.isPremiumGiftBox ? "Gift Box" : "Single Product"}</span>
                    </div>
                    <div className="grid grid-cols-2 py-4 border-b border-brand-border">
                      <span className="text-[#6B5A64] font-medium">Stock Availability</span>
                      <span className="text-[#1F1720] font-bold">{isOutOfStock ? "Out of Stock" : "In Stock"}</span>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="contents" className="mt-0">
                  {innerItemsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Array.from({ length: Math.max(product.itemsInside.length, 2) }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 rounded-3xl border border-brand-border bg-[#FFF7FB] animate-pulse">
                          <div className="w-16 h-16 rounded-2xl bg-gray-200/60" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200/60 rounded-md w-2/3" />
                            <div className="h-3 bg-gray-200/60 rounded-md w-1/3" />
                          </div>
                          <div className="w-12 h-6 bg-gray-200/60 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {product.itemsInside.map((entry) => {
                        const mainImgUrl = entry.mainImageUrl || "/logo/logo.png";
                        const itemSlug = entry.itemSlug || entry.itemId;
                        return (
                          <div key={entry.itemId} className="group relative flex items-center justify-between p-4 rounded-3xl border border-brand-border bg-[#FFF7FB] hover:bg-[#FFF2F8] hover:border-[#F2D0E4] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                            <Link href={`/products/${itemSlug}`} className="flex items-center gap-4 flex-1 min-w-0">
                              {/* Thumbnail Container with subtle grid background/border */}
                              <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-[#F1DFE8]/60 bg-white p-0.5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                <Image
                                  src={mainImgUrl}
                                  alt={entry.itemName}
                                  fill
                                  sizes="64px"
                                  className="object-cover rounded-xl"
                                  // Live fallback error handler
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/logo/logo.png";
                                  }}
                                />
                              </div>
                              {/* Item Text Metadata */}
                              <div className="min-w-0 flex-1">
                                <span className="block font-bold text-base text-[#1F1720] group-hover:text-[#A7066A] transition-colors truncate">
                                  {entry.itemName}
                                </span>
                                <span className="block text-xs font-semibold text-[#6B5A64] mt-0.5">
                                  {entry.itemStock > 0 ? (
                                    <span className="text-green-600">In Stock</span>
                                  ) : (
                                    <span className="text-red-500">Out of Stock</span>
                                  )}
                                </span>
                              </div>
                            </Link>
                            <Badge className="bg-[#FCEAF4] text-[#A7066A] border-0 px-4 py-1 text-sm font-bold shrink-0 self-center">
                              Qty {entry.quantity}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="reviews" className="mt-0">
                  <div className="bg-white rounded-3xl border border-brand-border p-8">
                    {reviews}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* RIGHT COLUMN (5 columns): Sticky Buy Box */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-8">
          <nav className="flex items-center gap-2 text-xs text-[#6B5A64] uppercase tracking-widest font-bold">
            <Link href="/" className="hover:text-[#A7066A] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/categories" className="hover:text-[#A7066A] transition-colors">Products</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#A7066A] truncate">{product.name}</span>
          </nav>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1F1720] leading-tight">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-yellow-400">
                <StarRating rating={Math.round(product.averageRating)} starClassName="w-4 h-4" />
                <span className="text-sm text-[#6B5A64] ml-2 font-medium">
                  {product.reviewCount > 0 
                    ? `${product.averageRating.toFixed(1)} (${product.reviewCount} reviews)`
                    : "No reviews yet"}
                </span>
              </div>
            </div>

            {product.shortDescription && (
              <p className="text-lg text-[#6B5A64] leading-relaxed line-clamp-3">
                {product.shortDescription}
              </p>
            )}

            <div className="pt-4 flex flex-col gap-2">
              <div className="flex items-end gap-3 flex-wrap">
                {discountInfo.hasDiscount ? (
                  <>
                    <span className="text-4xl font-bold text-[#A7066A]">
                      LKR {discountInfo.discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xl text-[#6B5A64] line-through mb-1">
                      LKR {discountInfo.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <Badge className="bg-[#FF4757] hover:bg-[#FF4757] text-white border-0 px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm mb-1 animate-pulse">
                      {discountInfo.discountPercentage}% {t("off")}
                    </Badge>
                  </>
                ) : (
                  <span className="text-4xl font-bold text-[#A7066A]">
                    LKR {discountInfo.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
                
                <Badge 
                  className={cn(
                    "mb-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                    isOutOfStock ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-700 border-green-100"
                  )}
                >
                  {isOutOfStock ? "Out of Stock" : "In Stock"}
                </Badge>
              </div>

              {discountInfo.hasDiscount && (
                <p className="text-sm font-semibold text-green-600">
                  {t("save", { amount: `LKR ${Math.round(discountInfo.savedAmount).toLocaleString()}` })}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-brand-border">
            {/* Variant Selectors */}
            {(product.sizes.length > 0 || product.colors.length > 0) && (
              <div className="space-y-4">
                {product.sizes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1F1720] uppercase tracking-wide">Select Size</label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeSelect(size)}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            selectedSize === size 
                              ? "border-[#A7066A] text-[#A7066A] bg-[#FFF7FB]" 
                              : "border-brand-border hover:border-pink-200 text-[#6B5A64]"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {product.colors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1F1720] uppercase tracking-wide">Select Color</label>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color) => {
                        const [colorName, colorHex] = color.includes('|') 
                          ? color.split('|') 
                          : [color, '#CCCCCC'];
                          
                        const isSelected = selectedColor === color;
                          
                        return (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                              isSelected 
                                ? "text-black bg-white" 
                                : "border-brand-border hover:border-neutral-300 text-[#6B5A64]"
                            }`}
                            style={{
                              borderColor: isSelected ? colorHex : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${colorHex}33` : undefined // 33 is 20% opacity in hex
                            }}
                          >
                            <span 
                              className="w-5 h-5 rounded-full border border-neutral-200 block shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                            <span>{colorName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center border-2 border-brand-border rounded-xl overflow-hidden bg-white">
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-none hover:bg-pink-50" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-none hover:bg-pink-50" onClick={() => setQuantity((prev) => prev + 1)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full h-14 text-lg font-bold bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-2xl shadow-lg shadow-pink-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                {isOutOfStock ? "Sold Out" : "Add to Cart"}
              </Button>
            </div>
          </div>

          {/* Secure Payment Options */}
          <div className="pt-6 border-t border-brand-border">
            <div className="rounded-2xl border border-brand-border bg-gray-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1F1720] uppercase tracking-wide">Secure Payment Options</span>
                <ShieldCheck className="w-4 h-4 text-green-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-white border border-brand-border shadow-sm group hover:border-[#A7066A] transition-colors text-center h-full min-h-[90px]">
                      <Icon className="w-6 h-6 text-[#A7066A] mb-1" />
                      <span className="text-[11px] font-bold text-[#1F1720] leading-tight">{method.title}</span>
                      <span className="text-[9px] text-[#6B5A64] leading-tight">{method.subtitle}</span>
                      {method.badge && (
                        <span className="absolute -top-2 -right-2 bg-pink-100 text-[#A7066A] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-pink-200">
                          {method.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Icons / Guarantee */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FCEAF4]/30 border border-[#F1DFE8]">
              <Truck className="w-5 h-5 text-[#A7066A]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1F1720]">Fast Delivery</span>
                <span className="text-[10px] text-[#6B5A64]">Island-wide</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FCEAF4]/30 border border-[#F1DFE8]">
              <ShieldCheck className="w-5 h-5 text-[#A7066A]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1F1720]">Secure Pay</span>
                <span className="text-[10px] text-[#6B5A64]">Guaranteed</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
