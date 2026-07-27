"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { FilterSidebar } from "@/components/byob/FilterSidebar";
import { ProductGrid } from "@/components/byob/ProductGrid";
import { Product } from "@/types/box-builder";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
});

export default function AddItemsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedOccasions, setOccasions] = useState<string[]>([]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Debounce Search Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Construct API Query
  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (minPrice) queryParams.set("minPrice", minPrice);
  if (maxPrice) queryParams.set("maxPrice", maxPrice);
  if (selectedOccasions.length > 0) queryParams.set("occasions", selectedOccasions.join(","));

  const { data, error, isLoading, mutate } = useSWR<{ products: Product[] }>(
    `/api/box-builder/products?${queryParams.toString()}`,
    fetcher,
    {
      onError: (err) => {
        toast.error("Error loading products", {
          position: "top-center",
        });
      }
    }
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setOccasions([]);
  }, []);

  const activeFilterCount =
    (search ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    selectedOccasions.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-12 py-8 flex-1 mt-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block sticky top-24">
            <FilterSidebar
              search={search}
              setSearch={setSearch}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              selectedOccasions={selectedOccasions}
              setOccasions={setOccasions}
            />
          </aside>

          {/* Mobile Filter Button */}
          <div className="md:hidden w-full sticky top-[20px] z-30 py-2">
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button className="w-full bg-white text-[#1F1720] border-brand-border hover:bg-gray-50 shadow-sm relative rounded-xl h-12">
                  <Filter className="w-4 h-4 mr-2 text-[#A7066A]" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-[#A7066A] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-6 overflow-y-auto">
                <SheetHeader className="mb-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle>Filters</SheetTitle>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-[#A7066A] text-xs font-bold"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </SheetHeader>
                <div className="pr-2">
                  <FilterSidebar
                    search={search}
                    setSearch={setSearch}
                    minPrice={minPrice}
                    setMinPrice={setMinPrice}
                    maxPrice={maxPrice}
                    setMaxPrice={setMaxPrice}
                    selectedOccasions={selectedOccasions}
                    setOccasions={setOccasions}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Grid Content */}
          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1F1720]">Add Items</h2>
              <span className="text-sm text-[#6B5A64]">
                {data?.products?.length || 0} Products Found
              </span>
            </div>

            {/* Active Filter Badges (Mobile View mainly) */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 md:hidden">
                {selectedOccasions.map(o => (
                  <Badge key={o} variant="secondary" className="bg-[#FCEAF4] text-[#A7066A] border-0 rounded-full">
                    {o}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setOccasions(selectedOccasions.filter(x => x !== o))} />
                  </Badge>
                ))}
              </div>
            )}

            <ProductGrid
              products={data?.products}
              isLoading={isLoading}
              error={error}
              onRetry={() => mutate()}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
