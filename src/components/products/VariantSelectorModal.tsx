"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, ShoppingCart, AlertTriangle, Package, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/CurrencyProvider";
import type {
  ProductVariantData,
  VariantProductPayload,
  VariantSelection,
} from "@/types/variant";
import { getColorStockMap } from "@/hooks/use-variant-selector";
import { toast } from "sonner";

// ─── Props ──────────────────────────────────────────────────────

interface VariantSelectorModalProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** The product requiring variant selection. null = nothing to show. */
  product: VariantProductPayload | null;
  /**
   * Called when the user confirms a valid selection.
   * The parent is responsible for actually adding to the cart.
   */
  onConfirm: (selection: VariantSelection) => void | Promise<void>;
  /** Optional: show server-side validation spinner */
  enableServerValidation?: boolean;
}

// ─── Component ──────────────────────────────────────────────────

export function VariantSelectorModal({
  open,
  onOpenChange,
  product,
  onConfirm,
  enableServerValidation = true,
}: VariantSelectorModalProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const { formatPrice } = useCurrency();
  const [isValidating, setIsValidating] = useState(false);

  // Reset selections when modal opens with a new product
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setSelectedSize("");
        setSelectedColor("");
        setIsValidating(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  // ─── Derived Data ─────────────────────────────────────────────

  const variants = product?.productVariants ?? [];
  const sizes = product?.sizes ?? [];
  const colors = product?.colors ?? [];

  /** color → stock number for the current size */
  const colorStockMap = useMemo(
    () => getColorStockMap(variants, selectedSize),
    [variants, selectedSize]
  );

  /** Exact match for current size+color */
  const matchingVariant = useMemo<ProductVariantData | null>(() => {
    if (sizes.length > 0 && !selectedSize) return null;
    if (colors.length > 0 && !selectedColor) return null;

    if (sizes.length === 0 && colors.length === 0) {
      return variants[0] ?? null;
    }

    return (
      variants.find((v) => {
        const sizeMatch = sizes.length === 0 || v.size?.toLowerCase() === selectedSize.toLowerCase();
        
        // Normalizes both sides to pure names for matching (e.g. "Black|#000000" -> "black")
        const variantColorName = typeof v.color === 'string' ? v.color.split('|')[0].toLowerCase() : '';
        const selectedColorName = typeof selectedColor === 'string' ? selectedColor.split('|')[0].toLowerCase() : '';
        
        const colorMatch = colors.length === 0 || variantColorName === selectedColorName;
        return sizeMatch && colorMatch;
      }) ?? null
    );
  }, [variants, selectedSize, selectedColor, sizes.length, colors.length]);

  // Debug-safe effect to log the matching process
  useEffect(() => {
    if (selectedSize || selectedColor) {
      console.log('[VariantSelectionModal] Match lookup:', {
        selectedSize,
        selectedColor,
        matched: matchingVariant,
        stock: matchingVariant?.stock,
        isOutOfStock: matchingVariant ? Number(matchingVariant.stock) <= 0 : false
      });
    }
  }, [selectedSize, selectedColor, matchingVariant]);

  const isOutOfStock = matchingVariant ? matchingVariant.stock <= 0 : false;
  const isLowStock =
    matchingVariant
      ? matchingVariant.stock > 0 && matchingVariant.stock < 3
      : false;

  const canConfirm = useMemo(() => {
    if (!product) return false;
    if (sizes.length > 0 && !selectedSize) return false;
    if (colors.length > 0 && !selectedColor) return false;
    if (isOutOfStock) return false;
    if (!matchingVariant) return false;
    return true;
  }, [product, sizes.length, colors.length, selectedSize, selectedColor, isOutOfStock, matchingVariant]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    // Auto-clear colour when size changes (prevents stale combos)
    setSelectedColor("");
  };

  const handleColorSelect = (color: string) => {
    const colorName = color.split('|')[0];
    const stock = colorStockMap.get(colorName) ?? 0;
    if (sizes.length > 0 && selectedSize && stock <= 0) return; // Don't allow selecting out-of-stock colors if size is picked
    setSelectedColor(color);
  };

  const handleConfirm = async () => {
    if (!canConfirm || !matchingVariant || !product) return;

    const selection: VariantSelection = {
      variantId: matchingVariant.variantId,
      size: matchingVariant.size,
      color: matchingVariant.color,
      sku: matchingVariant.sku,
      stock: matchingVariant.stock,
      price: matchingVariant.price,
    };

    if (enableServerValidation) {
      setIsValidating(true);
      try {
        const res = await fetch("/api/cart/validate-variant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            variantId: matchingVariant.variantId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message || "This variant is currently unavailable.", {
            position: "top-center",
          });
          setIsValidating(false);
          return;
        }
      } catch {
        toast.error("Failed to validate variant. Please try again.", {
          position: "top-center",
        });
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    await onConfirm(selection);
    handleOpenChange(false);
  };

  if (!product) return null;

  // ─── Render ───────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md md:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
        showCloseButton
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#A7066A] to-[#D4318C] px-6 pt-6 pb-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Variant
            </DialogTitle>
            <DialogDescription className="text-pink-100/80 text-sm mt-1">
              Choose a size{colors.length > 0 ? " and color" : ""} for{" "}
              <span className="font-semibold text-white">{product.name}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-6">
          {/* Size Selector */}
          {sizes.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                Size
                {selectedSize && (
                  <Badge variant="outline" className="font-semibold text-[#A7066A] border-[#A7066A]/30 bg-pink-50/50 text-xs">
                    {selectedSize}
                  </Badge>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const isActive = selectedSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      className={cn(
                        "relative px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200",
                        "hover:shadow-md active:scale-95",
                        isActive
                          ? "border-[#A7066A] bg-[#A7066A] text-white shadow-lg shadow-pink-200/50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50/50"
                      )}
                    >
                      {isActive && (
                        <Check className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white bg-[#A7066A] rounded-full p-0.5" />
                      )}
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Selector — only shows after size is picked (if sizes exist) */}
          {colors.length > 0 && (sizes.length === 0 || selectedSize) && (
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                Color
                {selectedColor && (
                  <Badge variant="outline" className="font-semibold text-[#A7066A] border-[#A7066A]/30 bg-pink-50/50 text-xs">
                    {selectedColor.split('|')[0]}
                  </Badge>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const [colorName, colorHex] = color.split('|');
                  const stock = colorStockMap.get(colorName);
                  // If we have a size selected, only show relevant colors
                  const isAvailableForSize =
                    sizes.length === 0 || !selectedSize || stock !== undefined;
                  const isOutOfStockColor =
                    stock !== undefined && stock <= 0;
                  const isActive = selectedColor === color;
                  const isDisabled = !isAvailableForSize || isOutOfStockColor;

                  return (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      disabled={isDisabled}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200",
                        isDisabled
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                          : "hover:shadow-md active:scale-95",
                        isActive && !isDisabled
                          ? "bg-white text-black"
                          : !isDisabled
                          ? "border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50/50"
                          : ""
                      )}
                      style={
                        isActive && !isDisabled && colorHex
                          ? {
                              borderColor: colorHex,
                              boxShadow: `0 0 0 2px ${colorHex}33`
                            }
                          : undefined
                      }
                    >
                      {isActive && !isDisabled && (
                        <Check 
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white rounded-full p-0.5 z-10" 
                          style={{ backgroundColor: colorHex || '#A7066A' }}
                        />
                      )}
                      
                      {colorHex && (
                        <div 
                          className="w-4 h-4 rounded-full border shadow-sm shrink-0" 
                          style={{ 
                            backgroundColor: colorHex,
                            borderColor: 'rgba(0,0,0,0.1)'
                          }} 
                        />
                      )}
                      
                      <span className={cn(isDisabled && "line-through")}>
                        {colorName || color}
                      </span>

                      {isOutOfStockColor && (
                        <span className="absolute -top-1 -right-1 text-[9px] bg-red-100 text-red-500 rounded-full px-1 font-bold z-10">
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt to select size first */}
          {sizes.length > 0 && !selectedSize && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-medium">Please select a size first to see available colors.</span>
            </div>
          )}

          {/* Low-stock Warning */}
          {isLowStock && matchingVariant && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="font-medium">
                Hurry! Only{" "}
                <span className="font-bold text-amber-800">
                  {matchingVariant.stock}
                </span>{" "}
                left in stock for {matchingVariant.size}
                {matchingVariant.color ? ` / ${matchingVariant.color.split('|')[0]}` : ""}.
              </span>
            </div>
          )}

          {/* Out-of-stock Warning */}
          {isOutOfStock && matchingVariant && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">
                This variant is currently out of stock. Please choose a different combination.
              </span>
            </div>
          )}

          {/* Selected variant summary */}
          {matchingVariant && !isOutOfStock && (
            <div className="flex flex-col gap-2 p-3 mt-2 rounded-xl bg-green-50/60 border border-green-100 text-sm animate-in fade-in-0 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    {matchingVariant.size}
                    {matchingVariant.color ? ` / ${matchingVariant.color.split('|')[0]}` : ""}
                  </span>
                  {matchingVariant.sku && (
                    <span className="text-green-600/60 text-xs">
                      SKU: {matchingVariant.sku}
                    </span>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-semibold">
                  {matchingVariant.stock} in stock
                </Badge>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-green-100/60 mt-1">
                <span className="text-green-800/80 text-xs font-medium">Selected Variant Price</span>
                <span className="text-lg font-bold text-[#A7066A]">
                  {formatPrice(matchingVariant.price ?? product.price)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <DialogFooter className="px-6 pb-6 pt-2">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1 h-12 rounded-xl font-semibold border-slate-200 hover:bg-slate-50"
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (matchingVariant) {
                  handleConfirm();
                }
              }}
              // Strict stock and existence check
              disabled={!matchingVariant || Number(matchingVariant.stock) <= 0 || isValidating}
              className={cn(
                "flex-[2] h-12 rounded-xl font-bold text-white transition-all duration-200 w-full",
                matchingVariant && Number(matchingVariant.stock) > 0 && !isValidating
                  ? "bg-[#A7066A] hover:bg-[#8A0558] shadow-lg shadow-pink-200/40 hover:shadow-xl hover:shadow-pink-300/40"
                  : "bg-slate-300 cursor-not-allowed"
              )}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {matchingVariant && Number(matchingVariant.stock) <= 0 ? "Out of Stock" : "Add Selected to Cart"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
