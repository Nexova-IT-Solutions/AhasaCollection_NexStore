"use client";

import { Product } from "@/types/box-builder";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw, PackageSearch } from "lucide-react";

interface ProductGridProps {
  products: Product[] | undefined;
  isLoading: boolean;
  error: any;
  onRetry: () => void;
  onClearFilters: () => void;
}

export const ProductGrid = ({
  products,
  isLoading,
  error,
  onRetry,
  onClearFilters
}: ProductGridProps) => {

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-4">
          <RotateCcw className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-[#1F1720]">Something went wrong</h3>
        <p className="text-[#6B5A64] mt-2 mb-6 max-w-xs">
          We couldn't load the products. Please check your connection and try again.
        </p>
        <Button
          onClick={onRetry}
          className="bg-[#A7066A] hover:bg-[#8B0557] rounded-full px-8"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl bg-gray-100" />
            <Skeleton className="h-4 w-3/4 bg-gray-100" />
            <Skeleton className="h-4 w-1/2 bg-gray-100" />
            <Skeleton className="h-9 w-full rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-[#FCEAF4] p-6 rounded-full mb-4">
          <PackageSearch className="w-12 h-12 text-[#A7066A]" />
        </div>
        <h3 className="text-xl font-bold text-[#1F1720]">No items found</h3>
        <p className="text-[#6B5A64] mt-2 mb-6">
          Try adjusting your filters to find what you're looking for.
        </p>
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="rounded-full border-brand-border hover:text-[#A7066A] hover:border-[#A7066A]"
        >
          Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
