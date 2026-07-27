"use client";

import * as React from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/CurrencyProvider";

export interface BYOBProductWithVariants {
  id: string;
  name: string;
  price: number;
  images: string[];
  sizes?: string[];
  colors?: string[];
}

interface ProductVariationDialogProps {
  product: BYOBProductWithVariants | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSize?: string, selectedColor?: string) => void;
}

export function ProductVariationDialog({
  product,
  isOpen,
  onClose,
  onConfirm,
}: ProductVariationDialogProps) {
  const [selectedSize, setSelectedSize] = React.useState<string>("");
  const [selectedColor, setSelectedColor] = React.useState<string>("");

  // Reset local states when a new product is selected
  React.useEffect(() => {
    if (product) {
      setSelectedSize("");
      setSelectedColor("");
    }
  }, [product]);

  if (!product) return null;

  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0;

  // Validation: Must select all available attributes to confirm
  const isSelectionComplete =
    (!hasSizes || selectedSize !== "") && (!hasColors || selectedColor !== "");

  const handleConfirm = () => {
    if (isSelectionComplete) {
      onConfirm(
        hasSizes ? selectedSize : undefined,
        hasColors ? selectedColor : undefined
      );
      onClose();
    }
  };

  const { formatPrice } = useCurrency();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-[#FCEAF4] bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black text-slate-800 tracking-tight text-left">
            Select Custom Options
          </DialogTitle>
          <p className="text-xs text-slate-400 font-bold text-left uppercase tracking-wider">
            Choose your variations for this item
          </p>
        </DialogHeader>

        <div className="flex gap-4 py-4 border-t border-slate-100">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-[#FCF9FB] shadow-inner">
            <Image
              src={product.images?.[0] || ""}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <h4 className="font-black text-slate-800 text-sm leading-tight truncate">
              {product.name}
            </h4>
            <p className="text-[#A7066A] font-black text-sm mt-1">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        <div className="space-y-6 py-2">
          {/* Sizes Selection */}
          {hasSizes && (
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                Available Sizes
              </span>
              <div className="flex flex-wrap gap-2">
                {product.sizes?.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl border-2 transition-all active:scale-95 duration-250",
                      selectedSize === size
                        ? "bg-[#A7066A] border-[#A7066A] text-white shadow-md shadow-[#A7066A]/20"
                        : "border-slate-200 text-slate-500 hover:border-[#A7066A]/30 hover:text-[#A7066A] bg-white"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors Selection */}
          {hasColors && (
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                Available Colors
              </span>
              <div className="flex flex-wrap gap-2.5">
                {product.colors?.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl border-2 transition-all active:scale-95 duration-250 flex items-center gap-2",
                      selectedColor === color
                        ? "bg-[#A7066A] border-[#A7066A] text-white shadow-md shadow-[#A7066A]/20"
                        : "border-slate-200 text-slate-500 hover:border-[#A7066A]/30 hover:text-[#A7066A] bg-white"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isSelectionComplete}
            className="rounded-2xl bg-[#A7066A] hover:bg-[#8B0557] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#A7066A]/20 disabled:opacity-40 disabled:shadow-none"
          >
            Add to Box
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
