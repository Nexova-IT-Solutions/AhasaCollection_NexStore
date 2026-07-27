"use client";

import { useMemo, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Sparkles,
  Truck,
  Shield,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const tCommon = useTranslations("Common");
  const t = useTranslations("Cart");
  const {
    items,
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
    clearPriceChangeFlags,
    isHydrated,
  } = useCartStore();
  const { status } = useSession();
  const router = useRouter();

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const totalSaved = getTotalSaved();
  const hasOutOfStockItems = items.some((item) => item.isOutOfStock);

  useEffect(() => {
    validateCartStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  /**
   * Live price synchronization – fires once on mount (when store is hydrated)
   * and whenever the item count changes. Fetches the latest DB prices and
   * automatically recalculates cart totals. Any mismatches populate the
   * priceChangedItems array so the UI can warn the customer.
   */
  const syncCartPrices = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const payload = items.map((item) => ({
        id: item.product?.id || item.giftBox?.id || item.id,
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
      console.error("Cart price sync error:", err);
    }
  }, [items, syncPrices]);

  useEffect(() => {
    if (isHydrated) {
      syncCartPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, items.length]);

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

  const formatPrice = (price: number) =>
    `LKR ${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getItemName = (item: (typeof items)[0]) => {
    if (item.type === "product") return item.product?.name ?? "Product";
    if (item.type === "giftbox") return item.giftBox?.name ?? "Gift Box";
    if (item.type === "giftcard")
      return `Digital Gift Card – ${item.virtualGiftCard?.currency} ${item.virtualGiftCard?.initialValue.toLocaleString()}`;
    return "Custom Gift Box";
  };

  const getItemImage = (item: (typeof items)[0]) => {
    if (item.type === "product") return item.product?.images[0];
    if (item.type === "giftbox") return item.giftBox?.images[0];
    if (item.type === "giftcard")
      return "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=100&h=100&fit=crop";
    return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100&h=100&fit=crop";
  };

  const getItemPrices = (item: (typeof items)[0]) => {
    if (typeof item.price === "number")
      return { price: item.price, originalPrice: item.originalPrice };

    let price = 0;
    let originalPrice: number | undefined;

    if (item.type === "product" && item.product) {
      price =
        item.selectedVariant?.price ?? item.product.salePrice ?? item.product.price;
      originalPrice =
        item.selectedVariant?.originalPrice ?? item.product.originalPrice;
      if (!originalPrice && item.product.salePrice && item.product.salePrice < item.product.price)
        originalPrice = item.product.price;
    } else if (item.type === "giftbox" && item.giftBox) {
      price = item.giftBox.salePrice ?? item.giftBox.price;
      originalPrice = item.giftBox.originalPrice;
      if (!originalPrice && item.giftBox.salePrice && item.giftBox.salePrice < item.giftBox.price)
        originalPrice = item.giftBox.price;
    } else if (item.type === "giftcard" && item.virtualGiftCard) {
      price = item.virtualGiftCard.initialValue;
    } else if (item.type === "custombox") {
      price = item.subtotal / item.quantity;
    }

    return { price, originalPrice };
  };

  /* ────────────────── Hydration gate ────────────────── */
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <CartDrawer />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#A7066A] border-t-transparent animate-spin" />
            <p className="text-sm text-[#6B5A64]">{t("loadingCart")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ────────────────── Empty state ────────────────── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <CartDrawer />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#FCEAF4] flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-[#A7066A]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1F1720]">{t("emptyTitle")}</h1>
            <p className="text-[#6B5A64] mt-2 mb-6">
              {t("emptySubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-[#A7066A] hover:bg-[#8B0557]">
                <Link href="/">{t("continueShopping")}</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#A7066A] text-[#A7066A]">
                <Link href="/box-builder">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("buildYourBox")}
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ────────────────── Cart with items ────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-10 py-6">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#6B5A64] hover:text-[#A7066A] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("continueShopping")}
          </Link>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1720]">
              {t("title")}{" "}
              <span className="text-lg font-normal text-[#6B5A64]">
                {itemCount === 1 ? t("itemsSingular", { count: itemCount }) : t("itemsPlural", { count: itemCount })}
              </span>
            </h1>
          </div>

          {/* ── Price-change warning banner ── */}
          {priceChangedItems.length > 0 && (
            <Alert className="mb-6 border-amber-500/30 bg-amber-50 text-amber-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 stroke-amber-600" />
              <AlertTitle className="font-semibold text-amber-900">
                {t("priceUpdateTitle")}
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-700 mt-1 space-y-1.5">
                <p>
                  {t("priceUpdateDesc")}
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {priceChangedItems.map((pci) => (
                    <li key={pci.id}>
                      <span className="font-medium">{pci.name}</span>:{" "}
                      <span className="line-through text-amber-600/80">
                        LKR {pci.oldPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>{" "}
                      →{" "}
                      <span className="font-semibold">
                        LKR {pci.newPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={clearPriceChangeFlags}
                  className="mt-1 text-[11px] font-bold text-amber-900 underline underline-offset-2 hover:text-amber-700 transition-colors"
                >
                  {t("dismiss")}
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Item list ── */}
            <div className="lg:col-span-2">
              <div className="divide-y divide-brand-border/30">
                {items.map((item) => {
                  const { price, originalPrice } = getItemPrices(item);
                  const hasDiscount = !!originalPrice && originalPrice > price;
                  const savedAmount = hasDiscount
                    ? (originalPrice! - price) * item.quantity
                    : 0;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        // Single horizontal row on all screen sizes
                        "flex items-center gap-3 w-full py-4",
                        item.isOutOfStock && "opacity-50 grayscale"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[#FCEAF4] border border-brand-border/30 shadow-sm">
                        <Image
                          src={getItemImage(item) || "/placeholder.jpg"}
                          alt={getItemName(item)}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                        {item.type === "custombox" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info – grows, truncates */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={
                            item.type === "product" && item.product
                              ? `/products/${item.product.id}`
                              : "#"
                          }
                          className="block font-semibold text-sm sm:text-base text-[#1F1720] hover:text-[#A7066A] transition-colors line-clamp-2 leading-snug"
                        >
                          {getItemName(item)}
                        </Link>
                        {item.selectedVariant && (
                          <span className="mt-1 inline-block text-[10px] sm:text-[11px] font-semibold text-[#A7066A] bg-[#FCEAF4] px-2 py-0.5 rounded-full">
                            {item.selectedVariant.name}
                          </span>
                        )}
                        {item.type === "custombox" && item.customBox && (
                          <p className="text-xs text-[#6B5A64] mt-0.5">
                            {item.customBox.items.length === 1 ? t("itemsSingular", { count: item.customBox.items.length }) : t("itemsPlural", { count: item.customBox.items.length })} · {item.customBox.boxType.name}
                          </p>
                        )}
                        {item.isOutOfStock && (
                          <p className="mt-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block">
                            {t("outOfStockWarning")}
                          </p>
                        )}
                        {/* Unit price – visible on sm+ */}
                        <p className="hidden sm:block text-xs text-[#6B5A64] mt-1">
                          {formatPrice(price)} {t("each")}
                        </p>
                      </div>

                      {/* Quantity stepper – fixed w-24 h-8, never shrinks */}
                      <div className="flex-shrink-0 flex items-center border border-brand-border/50 rounded-md h-8 w-24 justify-between px-2 bg-secondary overflow-hidden">
                        <button
                          aria-label={t("decreaseQuantity")}
                          className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#6B5A64] hover:bg-[#FCEAF4] transition-colors"
                          onClick={() =>
                            updateQuantity(item.id, Math.max(1, item.quantity - 1))
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-[#1F1720] select-none">
                          {item.quantity}
                        </span>
                        <button
                          aria-label={t("increaseQuantity")}
                          className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#6B5A64] hover:bg-[#FCEAF4] transition-colors"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Price + Remove – ml-auto anchors right, never shrinks */}
                      <div className="ml-auto flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          {hasDiscount && (
                            <p className="text-xs text-[#6B5A64] line-through leading-none">
                              {formatPrice(originalPrice! * item.quantity)}
                            </p>
                          )}
                          <p className="text-sm sm:text-base font-bold text-[#A7066A] leading-tight">
                            {formatPrice(item.subtotal)}
                          </p>
                          {hasDiscount && savedAmount > 0 && (
                            <span className="mt-0.5 inline-block text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded leading-none">
                              {tCommon("save", {
                                amount: `LKR ${Math.round(savedAmount).toLocaleString()}`,
                              })}
                            </span>
                          )}
                        </div>
                        <button
                          aria-label={t("removeItem")}
                          className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add-ons */}
              {specialTouchItems.length > 0 && !isDigitalOnly && (
                <div className="mt-8">
                  <h2 className="text-base sm:text-lg font-semibold text-[#1F1720] mb-4">
                    {t("addSpecialTouch")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {specialTouchItems.map((product) => {
                      const displayPrice =
                        typeof product.salePrice === "number" &&
                        product.salePrice < product.price
                          ? product.salePrice
                          : product.price;
                      return (
                        <div
                          key={product.id}
                          className="rounded-xl bg-white border border-brand-border p-3 text-center group"
                        >
                          <button
                            type="button"
                            onClick={() => addItem(product)}
                            className="w-full"
                          >
                            <div className="relative w-14 h-14 mx-auto rounded-lg overflow-hidden bg-[#FCEAF4] mb-2">
                              <Image
                                src={product.images[0] || "/logo/logo.png"}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <p className="text-sm font-medium text-[#1F1720] line-clamp-1 group-hover:text-[#A7066A]">
                              {product.name}
                            </p>
                            <p className="text-sm text-[#A7066A] font-semibold">
                              {formatPrice(displayPrice)}
                            </p>
                            <span className="mt-2 inline-flex rounded-full bg-[#FCEAF4] px-3 py-1 text-xs font-semibold text-[#A7066A]">
                              {t("add")}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Order Summary ── */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-brand-border">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-[#1F1720] mb-4">{t("orderSummary")}</h2>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B5A64]">{itemCount === 1 ? t("subtotalItemsSingular", { count: itemCount }) : t("subtotalItemsPlural", { count: itemCount })}</span>
                      <span className="text-[#1F1720] font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    {totalSaved > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <Tag className="h-3.5 w-3.5" />
                          {t("youSave")}
                        </span>
                        <span className="text-green-600 font-medium">
                          −{formatPrice(totalSaved)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6B5A64]">{t("delivery")}</span>
                      <span className="text-[#A7066A]">{t("calculatedAtCheckout")}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-[#1F1720]">{t("total")}</span>
                      <span className="text-[#A7066A]">{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  <div
                    className="mt-5"
                    title={hasOutOfStockItems ? t("someOutOfStock") : undefined}
                  >
                    <Button
                      disabled={hasOutOfStockItems}
                      className="w-full bg-gradient-to-r from-[#A7066A] to-[#E91E8C] hover:opacity-90 disabled:opacity-50 h-11"
                      size="lg"
                      onClick={() => {
                        if (hasOutOfStockItems) return;
                        if (status === "unauthenticated") {
                          router.push(
                            `/sign-in?callbackUrl=${encodeURIComponent("/checkout")}`
                          );
                        } else {
                          router.push("/checkout");
                        }
                      }}
                    >
                      {t("proceedToCheckout")}
                    </Button>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-[#6B5A64]">
                      <Truck className="w-4 h-4 text-[#A7066A] flex-shrink-0" />
                      <span>{t("islandWideDelivery")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#6B5A64]">
                      <Shield className="w-4 h-4 text-[#A7066A] flex-shrink-0" />
                      <span>{t("secureCheckout")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
