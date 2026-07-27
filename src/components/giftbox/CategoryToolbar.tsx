"use client";

import { Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CategoryToolbarProps {
  totalProducts: number;
  sortBy: string;
  viewMode: "grid" | "list";
}

export function CategoryToolbar({ totalProducts, sortBy, viewMode }: CategoryToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const handleSortChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("sort", value)}`, { scroll: false });
  };

  const handleViewChange = (mode: "grid" | "list") => {
    router.push(`${pathname}?${createQueryString("view", mode)}`, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-brand-border">
      <p className="text-sm text-[#6B5A64]">
        Showing <span className="font-medium text-[#1F1720]">{totalProducts}</span> products
      </p>
      <div className="flex items-center gap-3">
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px] border-brand-border">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <div className="hidden sm:flex items-center gap-1 border border-brand-border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewChange("grid")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewChange("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
