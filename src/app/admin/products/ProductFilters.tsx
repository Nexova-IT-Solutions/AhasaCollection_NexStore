"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  initialFilters: {
    q: string;
    category: string;
    occasion: string;
    stock: string;
    isTrending: boolean;
    isNewArrival: boolean;
    showInDiscountSection: boolean;
    isTopRated: boolean;
    isBestSeller: boolean;
    showInChocolateSection: boolean;
    showInSoftToysSection: boolean;
  };
}

export function ProductFilters({ initialFilters }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialFilters.q);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);



  // Sync state with URL when it changes externally
  useEffect(() => {
    setQ(initialFilters.q);
  }, [initialFilters.q]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      // Fetch all categories without pagination by passing a large limit
      const res = await fetch("/api/admin/categories?page=1&limit=500");
      if (res.ok) {
        const json = await res.json();
        // API returns { data: [...], total, ... } when paginated (always), or a raw array as fallback
        const list: Category[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setCategories(list);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 on any filter change except page change
    if (!updates.page) {
      params.set("page", "1");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    const tab = searchParams.get("tab");
    if (tab) params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-6 rounded-2xl border border-brand-border bg-white p-4 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="min-w-[300px] flex-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5A64]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    updateSearchParams({ q, page: "1" });
                  }
                }}
                placeholder="Search by name or SKU..."
                className="h-11 pl-10 pr-10 rounded-xl border-brand-border focus:ring-[#A7066A]"
              />
              {q && (
                <button
                  onClick={() => {
                    setQ("");
                    updateSearchParams({ q: "", page: "1" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5A64] hover:text-[#A7066A]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              onClick={() => updateSearchParams({ q, page: "1" })}
              className="h-11 px-4 bg-[#A7066A] text-white hover:bg-[#8A0558] rounded-xl flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="w-full sm:w-[220px]">
          <Select
            value={initialFilters.category || "all"}
            onValueChange={(value) => updateSearchParams({ category: value })}
          >
            <SelectTrigger className="h-11 rounded-xl border-brand-border">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Status */}
        <div className="w-full sm:w-[180px]">
          <Select
            value={initialFilters.stock || "all"}
            onValueChange={(value) => updateSearchParams({ stock: value })}
          >
            <SelectTrigger className="h-11 rounded-xl border-brand-border">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={handleClearAll}
          className="h-11 border-brand-border rounded-xl px-6 hover:bg-[#FCEAF4] hover:text-[#A7066A] transition-colors"
        >
          Clear All
        </Button>
      </div>


    </div>
  );
}
