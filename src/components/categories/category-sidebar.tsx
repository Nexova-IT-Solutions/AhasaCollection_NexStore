"use client";

import { CategoriesFilters } from "@/app/[locale]/categories/_components/categories-filters";

type FilterItem = { id: string; name: string; slug: string; icon?: string | null; parentId?: string | null };

type CategorySidebarProps = {
  categories: FilterItem[];
  occasions: FilterItem[];
  recipients: FilterItem[];
  moods: FilterItem[];
  priceRangeMetadata?: { min: number; max: number };
  hideOutOfStock?: boolean;
  initialValues: {
    categories?: string[];
    occasion?: string;
    recipient?: string;
    mood?: string;
    filter?: "new-arrivals" | "trending" | "premium-boxes" | "chocolates" | "discounted" | "soft-toys";
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
    view?: "grid" | "list";
    limit?: number;
    byob?: boolean;
  };
};

export function CategorySidebar(props: CategorySidebarProps) {
  return <CategoriesFilters {...props} />;
}
