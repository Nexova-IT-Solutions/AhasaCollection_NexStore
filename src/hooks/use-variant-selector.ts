"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ProductVariantData,
  VariantProductPayload,
  VariantSelection,
} from "@/types/variant";

interface UseVariantSelectorReturn {
  // Modal state
  isOpen: boolean;
  pendingProduct: VariantProductPayload | null;
  open: (product: VariantProductPayload) => void;
  close: () => void;

  // Selection state
  selectedSize: string;
  selectedColor: string;
  setSelectedSize: (size: string) => void;
  setSelectedColor: (color: string) => void;

  // Derived data
  availableColorsForSize: string[];
  matchingVariant: ProductVariantData | null;
  isSelectedColorOutOfStock: boolean;
  isLowStock: boolean;
  lowStockCount: number;
  canConfirm: boolean;

  // Actions
  confirm: () => VariantSelection | null;
  reset: () => void;
}

/**
 * Shared headless hook powering the VariantSelectorModal.
 * Encapsulates all variant filtering / stock logic so it can be reused
 * across Storefront and POS without duplicating business rules.
 */
export function useVariantSelector(): UseVariantSelectorReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<VariantProductPayload | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const open = useCallback((product: VariantProductPayload) => {
    setPendingProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep pendingProduct briefly so the exit animation can still read it
    setTimeout(() => {
      setPendingProduct(null);
      setSelectedSize("");
      setSelectedColor("");
    }, 300);
  }, []);

  const reset = useCallback(() => {
    setSelectedSize("");
    setSelectedColor("");
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────

  /** All colors that exist under the currently-selected size */
  const availableColorsForSize = useMemo(() => {
    if (!pendingProduct || !selectedSize) return pendingProduct?.colors ?? [];

    const matching = pendingProduct.productVariants.filter(
      (v) => v.size.toLowerCase() === selectedSize.toLowerCase()
    );

    // Return unique colors preserving order from product.colors
    const colorSet = new Set(matching.map((v) => v.color));
    return pendingProduct.colors.filter((c) => colorSet.has(c));
  }, [pendingProduct, selectedSize]);

  /** The exact variant matching the current size+color selection */
  const matchingVariant = useMemo(() => {
    if (!pendingProduct || !selectedSize) return null;

    return (
      pendingProduct.productVariants.find((v) => {
        const sizeMatch = v.size.toLowerCase() === selectedSize.toLowerCase();
        const colorMatch =
          !selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase();
        return sizeMatch && colorMatch;
      }) ?? null
    );
  }, [pendingProduct, selectedSize, selectedColor]);

  const isSelectedColorOutOfStock = useMemo(() => {
    if (!matchingVariant) return false;
    return matchingVariant.stock <= 0;
  }, [matchingVariant]);

  const LOW_STOCK_THRESHOLD = 3;

  const isLowStock = useMemo(() => {
    if (!matchingVariant) return false;
    return matchingVariant.stock > 0 && matchingVariant.stock < LOW_STOCK_THRESHOLD;
  }, [matchingVariant]);

  const lowStockCount = matchingVariant?.stock ?? 0;

  /** Can the user hit "Add to Cart"? */
  const canConfirm = useMemo(() => {
    if (!pendingProduct) return false;

    const hasSizes = pendingProduct.sizes.length > 0;
    const hasColors = pendingProduct.colors.length > 0;

    if (hasSizes && !selectedSize) return false;
    if (hasColors && !selectedColor) return false;
    if (isSelectedColorOutOfStock) return false;
    if (!matchingVariant) return false;

    return true;
  }, [pendingProduct, selectedSize, selectedColor, isSelectedColorOutOfStock, matchingVariant]);

  const confirm = useCallback((): VariantSelection | null => {
    if (!canConfirm || !matchingVariant) return null;

    return {
      variantId: matchingVariant.variantId,
      size: matchingVariant.size,
      color: matchingVariant.color,
      sku: matchingVariant.sku,
      stock: matchingVariant.stock,
      price: matchingVariant.price,
    };
  }, [canConfirm, matchingVariant]);

  /**
   * Helper: checks stock for a specific color chip in the current size.
   * Used by the modal to grey-out out-of-stock colour chips.
   */

  return {
    isOpen,
    pendingProduct,
    open,
    close,
    selectedSize,
    selectedColor,
    setSelectedSize,
    setSelectedColor,
    availableColorsForSize,
    matchingVariant,
    isSelectedColorOutOfStock,
    isLowStock,
    lowStockCount,
    canConfirm,
    confirm,
    reset,
  };
}

/**
 * Utility: given a list of variants and a selected size,
 * returns a map of color → stock so the UI can disable chips.
 */
export function getColorStockMap(
  variants: ProductVariantData[],
  selectedSize: string
): Map<string, number> {
  const map = new Map<string, number>();
  if (!selectedSize) return map;

  variants
    .filter((v) => v.size.toLowerCase() === selectedSize.toLowerCase())
    .forEach((v) => {
      map.set(v.color, v.stock);
    });

  return map;
}
