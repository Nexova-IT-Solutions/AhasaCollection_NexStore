"use client";

import { useMemo, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Minus, ShoppingBag, Sparkles, Tag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/CurrencyProvider";
import { CartItem } from "@/types";

interface CartItemRowProps {
  item: CartItem;
  t: any;
  tCommon: any;
  formatPrice: (price: number) => string;
  getItemImage: (item: CartItem) => string | undefined;
  getItemName: (item: CartItem) => string;
  getOriginalPrice: (item: CartItem) => number | null;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}

function CartItemRow({
  item,
  t,
  tCommon,
  formatPrice,
  getItemImage,
  getItemName,
  getOriginalPrice,
  updateQuantity,
  removeItem,
}: CartItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const purchasePrice =
    typeof item.price === "number"
      ? item.price
      : item.subtotal / item.quantity;
  const originalPrice = getOriginalPrice(item);
  const hasDiscount = !!originalPrice && originalPrice > purchasePrice;
  const savedAmount = hasDiscount
    ? (originalPrice! - purchasePrice) * item.quantity
    : 0;

  const customBoxDetails = (() => {
    if (item.isCustomBox && item.customBoxConfig) {
      try {
        const config = typeof item.customBoxConfig === "string"
          ? JSON.parse(item.customBoxConfig)
          : item.customBoxConfig;
        return {
          wrapName: config.wrapName || config.wrapping?.name || "",
          wrapImage: config.wrapImage || config.wrapping?.imageUrl || config.wrapping?.image || "",
          giftMessage: config.giftMessage || config.message || "",
          items: Array.isArray(config.items)
            ? config.items.map((i: any) => ({
                name: i.name || i.product?.name || i.item?.name || "Item",
                quantity: i.quantity || 1,
                image: i.image || i.product?.images?.[0] || i.item?.images?.[0] || i.product?.image || i.item?.image || "",
                variantName: i.variantName || i.selectedVariant?.name || (i.selectedSize || i.selectedColor ? `${i.selectedSize || ''} ${i.selectedColor ? `/ ${i.selectedColor.split('|')[0]}` : ''}`.trim() : "")
              }))
            : [],
        };
      } catch (e) {
        console.error("Failed to parse customBoxConfig:", e);
      }
    }
    if (item.type === "custombox" && item.customBox) {
      return {
        wrapName: item.customBox.wrapping?.name || "",
        wrapImage: item.customBox.wrapping?.imageUrl || item.customBox.wrapping?.image || "",
        giftMessage: item.customBox.message || "",
        items: item.customBox.items.map((i: any) => ({
          name: i.item?.name || i.product?.name || "Item",
          quantity: i.quantity || 1,
          image: i.item?.imageUrl || i.item?.image || i.item?.images?.[0] || i.product?.images?.[0] || "",
          variantName: i.variantName || i.selectedVariant?.name || (i.selectedSize || i.selectedColor ? `${i.selectedSize || ''} ${i.selectedColor ? `/ ${i.selectedColor.split('|')[0]}` : ''}`.trim() : "")
        })),
      };
    }
    return null;
  })();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 w-full py-3",
        item.isOutOfStock && "opacity-50 grayscale"
      )}
    >
      <div className="flex items-start gap-3 w-full">
        {/* Thumbnail */}
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-brand-border/20 bg-white shadow-sm mt-0.5">
          <Image
            src={getItemImage(item) || "/placeholder.jpg"}
            alt={getItemName(item)}
            fill
            className="object-cover"
          />
          {item.type === "custombox" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Info Column - holds description, price, variant, action details, and metadata */}
        <div className="flex flex-col flex-1 min-w-0 items-start">
          <h4 className="font-semibold text-sm text-[#1F1720] truncate w-full">{getItemName(item)}</h4>
          {item.variantName ? (
            <p className="text-xs text-gray-500 mt-1 mb-1">
              Variant: <span className="font-medium text-gray-700">{item.variantName}</span>
            </p>
          ) : item.selectedVariant?.name ? (
            <p className="text-xs text-gray-500 mt-1 mb-1">
              Variant: <span className="font-medium text-gray-700">{item.selectedVariant.name}</span>
            </p>
          ) : null}

          {/* Stepper + Price Actions row directly under price */}
          <div className="flex items-center justify-between w-full mt-2 gap-2">
            {/* Quantity stepper – fixed w-24 h-8, never shrinks */}
            <div className="flex-shrink-0 flex items-center border border-brand-border/40 rounded-md h-8 w-24 justify-between px-2 bg-secondary overflow-hidden">
              <button
                aria-label={t("decreaseQuantity")}
                className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#6B5A64] hover:bg-[#FCEAF4] transition-colors"
                onClick={() =>
                  updateQuantity(item.id, Math.max(1, item.quantity - 1))
                }
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-bold text-[#1F1720] select-none">
                {item.quantity}
              </span>
              <button
                aria-label={t("increaseQuantity")}
                className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#6B5A64] hover:bg-[#FCEAF4] transition-colors"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Price + Remove – ml-auto anchors right, never shrinks */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                {hasDiscount && (
                  <p className="text-[10px] text-gray-400 line-through leading-none">
                    {formatPrice(originalPrice! * item.quantity)}
                  </p>
                )}
                <p className="text-sm font-bold text-[#A7066A] leading-tight">
                  {formatPrice(item.subtotal)}
                </p>
                {hasDiscount && savedAmount > 0 && (
                  <p className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded mt-0.5 leading-none">
                    {tCommon("save", {
                      amount: formatPrice(savedAmount),
                    })}
                  </p>
                )}
              </div>
              <button
                aria-label={t("removeItem")}
                className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                onClick={() => removeItem(item.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Toggle Span placed exactly below actions row */}
          {(item.isCustomBox || item.type === "custombox") && (
            <span
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-primary cursor-pointer hover:underline inline-block mt-2 select-none"
            >
              {isExpanded ? "Hide Box Details (-)" : "View Box Details (+)"}
            </span>
          )}

          {/* Expanded Box Data - Rendered inline within the column */}
          {(item.isCustomBox || item.type === "custombox") && isExpanded && customBoxDetails && (
            <div className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground space-y-2 w-full border border-border/40">
              {/* Wrap Info */}
              <div className="flex items-center gap-2 border-b border-border/60 pb-1.5 w-full">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-foreground/70 shrink-0">Wrap:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {customBoxDetails.wrapImage && (
                    <img src={customBoxDetails.wrapImage} alt="" className="h-5 w-5 rounded object-cover border shrink-0" />
                  )}
                  <span className="truncate text-foreground text-[11px]">{customBoxDetails.wrapName || "Standard"}</span>
                </div>
              </div>

              {/* Items Inside */}
              <div className="space-y-1 w-full">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-foreground/70 block">Items Inside:</span>
                <div className="grid gap-1 w-full">
                  {customBoxDetails.items.map((subItem: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 w-full bg-background/60 p-1.5 rounded border border-border/40">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img src={subItem.image || "/placeholder.png"} alt="" className="h-5 w-5 rounded object-cover shrink-0 border" />
                          <span className="truncate text-foreground text-[11px] font-medium">{subItem.name}</span>
                        </div>
                        <span className="text-[10px] bg-muted px-1 rounded font-medium text-foreground shrink-0">x{subItem.quantity}</span>
                      </div>
                      {subItem.variantName && (
                        <p className="text-[9px] text-gray-500 pl-6.5 leading-none">
                          Variant: <span className="font-medium text-gray-700">{subItem.variantName}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              {customBoxDetails.giftMessage && (
                <div className="pt-1 border-t border-border/60 w-full">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-foreground/70 block mb-0.5">Message:</span>
                  <p className="italic bg-background/40 p-1 rounded border border-dashed text-foreground/90 break-words whitespace-pre-wrap text-[11px]">
                    "{customBoxDetails.giftMessage}"
                  </p>
                </div>
              )}
            </div>
          )}

          {item.isOutOfStock && (
            <p className="mt-2 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block">
              {t("outOfStockWarning")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const tCommon = useTranslations("Common");
  const t = useTranslations("Cart");
  const {
    items,
    isCartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    addItem,
    specialTouchProducts,
    getSubtotal,
    getItemCount,
    getTotalSaved,
    validateCartStock,
    syncPrices,
    priceChangedItems,
    isHydrated,
  } = useCartStore();
  const { status } = useSession();
  const router = useRouter();

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const totalSaved = getTotalSaved();
  const hasOutOfStockItems = items.some((item) => item.isOutOfStock);

  const productIdsInCart = useMemo(
    () =>
      new Set(
        items.flatMap((item) =>
          item.type === "product" && item.product?.id ? [item.product.id] : []
        )
      ),
    [items]
  );

  const specialTouchItems = useMemo(
    () =>
      specialTouchProducts
        .filter((p) => p.stock > 0 && !productIdsInCart.has(p.id))
        .slice(0, 4),
    [productIdsInCart, specialTouchProducts]
  );

  const isDigitalOnly = useMemo(
    () => items.length > 0 && items.every((i) => i.isDigital || i.type === "giftcard"),
    [items]
  );

  useEffect(() => {
    if (!isCartOpen) return;
    validateCartStock();

    const syncCartPrices = async () => {
      if (items.length === 0) return;
      try {
        const payload = items.map((item) => ({
          cartItemId: item.id,
          id: item.product?.id || item.giftBox?.id || item.id,
          variantId: item.selectedVariant?.id,
          type: item.type,
        }));
        const res = await fetch("/api/v1/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload }),
        });
        if (res.ok) {
          const { data } = await res.json();
          syncPrices(data);
        }
      } catch (err) {
        console.error("Cart background sync error:", err);
      }
    };

    syncCartPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen, items.length]);

  const { formatPrice } = useCurrency();

  const getItemName = (item: (typeof items)[0]) => {
    if (item.type === "product") return item.product?.name ?? "Product";
    if (item.type === "giftbox") return item.giftBox?.name ?? "Gift Box";
    if (item.type === "giftcard")
      return `Digital Gift Card – ${formatPrice(item.virtualGiftCard?.initialValue || 0)}`;
    return "Custom Gift Box";
  };

  const getItemImage = (item: (typeof items)[0]) => {
    if (item.type === "product") return item.product?.images[0];
    if (item.type === "giftbox") return item.giftBox?.images[0];
    if (item.type === "giftcard") return "/images/giftcard-placeholder.png";
    return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100&h=100&fit=crop";
  };

  const getOriginalPrice = (item: (typeof items)[0]): number | null => {
    // 1. Conditional Discount Display: Ensure variant items only calculate savings 
    // against their own variant-specific discounts, NEVER inheriting from the base product.
    if (item.selectedVariant) {
      const vOriginal = item.selectedVariant.originalPrice;
      if (typeof vOriginal === "number" && vOriginal > item.selectedVariant.price) {
        return vOriginal;
      }
      return null; // Force null so the UI badge safely hides
    }

    if (typeof item.originalPrice === "number") return item.originalPrice;
    if (item.type === "product" && item.product) {
      const { price, originalPrice, salePrice } = item.product;
      if (typeof originalPrice === "number" && originalPrice > price) return originalPrice;
      if (typeof salePrice === "number" && salePrice < price) return price;
    }
    if (item.type === "giftbox" && item.giftBox) {
      const { price, originalPrice, salePrice } = item.giftBox;
      if (typeof originalPrice === "number" && originalPrice > price) return originalPrice;
      if (typeof salePrice === "number" && salePrice < price) return price;
    }
    return null;
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()} modal={false}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md h-full">

        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 flex-shrink-0 border-b border-brand-border/20">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-[#A7066A]" />
            {t("title")}
            {itemCount > 0 && (
              <span className="text-sm font-normal text-[#6B5A64]">
                {itemCount === 1 ? t("itemsSingular", { count: itemCount }) : t("itemsPlural", { count: itemCount })}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* ── Empty state ── */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FCEAF4]">
              <ShoppingBag className="h-10 w-10 text-[#A7066A]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F1720]">{t("emptyTitle")}</h3>
            <p className="mt-1 mb-6 text-sm text-[#6B5A64]">
              {t("emptySubtitle")}
            </p>
            <Button onClick={closeCart} asChild className="bg-[#A7066A] hover:bg-[#8B0557]">
              <Link href="/">{t("continueShopping")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0">

            {/* ── Scrollable list ── */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
              {priceChangedItems.length > 0 && (
                <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-[11px] font-medium text-amber-800 leading-snug">
                    {t("somePricesUpdated")}
                  </p>
                </div>
              )}
              <div className="divide-y divide-brand-border/20 px-3">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    t={t}
                    tCommon={tCommon}
                    formatPrice={formatPrice}
                    getItemImage={getItemImage}
                    getItemName={getItemName}
                    getOriginalPrice={getOriginalPrice}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />
                ))}
              </div>

              {/* Special Touch suggestions */}
              {specialTouchItems.length > 0 && !isDigitalOnly && (
                <div className="mx-3 mt-4 mb-3 border-t border-brand-border/20 pt-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B5A64]">
                    {t("addSpecialTouch")}
                  </h4>
                  <div className="space-y-2">
                    {specialTouchItems.map((product) => {
                      const displayPrice =
                        typeof product.salePrice === "number" &&
                        product.salePrice < product.price
                          ? product.salePrice
                          : product.price;
                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-lg border border-brand-border bg-white p-2"
                        >
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-[#FCEAF4]">
                            <Image
                              src={product.images[0] || "/logo/logo.png"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-[#1F1720]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[#6B5A64]">{formatPrice(displayPrice)}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-shrink-0 bg-[#A7066A] px-3 text-xs hover:bg-[#8B0557]"
                            onClick={() => addItem(product)}
                          >
                            {t("add")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <SheetFooter className="border-t border-brand-border/20 p-5 flex-shrink-0 bg-white">
              <div className="w-full space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B5A64]">{t("subtotal")}</span>
                    <span className="font-medium text-[#1F1720]">{formatPrice(subtotal)}</span>
                  </div>
                  {totalSaved > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-green-600">
                        <Tag className="h-3.5 w-3.5" />
                        {t("youSave")}
                      </span>
                      <span className="font-medium text-green-600">−{formatPrice(totalSaved)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B5A64]">{t("delivery")}</span>
                    <span className="text-[#A7066A]">{t("calculatedAtCheckout")}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#1F1720]">{t("total")}</span>
                    <span className="text-base text-[#A7066A]">{formatPrice(subtotal)}</span>
                  </div>
                </div>

                <Button
                  disabled={hasOutOfStockItems}
                  className="w-full bg-[#A7066A] text-white hover:bg-[#8B0557] disabled:opacity-50 h-11 rounded-xl"
                  title={hasOutOfStockItems ? t("someOutOfStock") : undefined}
                  onClick={() => {
                    if (hasOutOfStockItems) return;
                    closeCart();
                    if (status === "unauthenticated") {
                      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/checkout")}`);
                    } else {
                      router.push("/checkout");
                    }
                  }}
                >
                  {t("proceedToCheckout")}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-brand-border h-11 rounded-xl"
                  onClick={closeCart}
                >
                  <Link href="/cart">{t("viewFullCart")}</Link>
                </Button>
              </div>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
