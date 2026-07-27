"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, SlidersHorizontal, Sparkles, Flame, Gift, Candy, Tag, Rabbit, ChevronDown, X } from "lucide-react";
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type FilterItem = { id: string; name: string; slug: string; icon?: string | null; parentId?: string | null };

type CategoriesFiltersProps = {
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

const QUICK_FILTERS = [
  { value: "new-arrivals" as const, label: "New Arrivals", icon: Sparkles },
  { value: "trending" as const, label: "Trending", icon: Flame },
  { value: "premium-boxes" as const, label: "Gift Boxes", icon: Gift },
  { value: "chocolates" as const, label: "Chocolates", icon: Candy },
  { value: "discounted" as const, label: "On Sale", icon: Tag },
  { value: "soft-toys" as const, label: "Soft Toys", icon: Rabbit },
];

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 50000;

export function CategoriesFilters({ categories, occasions, recipients, moods, priceRangeMetadata, hideOutOfStock, initialValues }: CategoriesFiltersProps) {
  const t = useTranslations("Categories");
  const PRICE_MIN = priceRangeMetadata?.min ?? DEFAULT_PRICE_MIN;
  const PRICE_MAX = priceRangeMetadata?.max ?? DEFAULT_PRICE_MAX;
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [queryState, setQueryState] = useQueryStates(
    {
      categoryId: parseAsString,
      categories: parseAsArrayOf(parseAsString, ",").withDefault([]),
      category: parseAsString,
      occasion: parseAsString,
      recipient: parseAsString,
      mood: parseAsString,
      filter: parseAsStringLiteral(["new-arrivals", "trending", "premium-boxes", "chocolates", "discounted", "soft-toys"]),
      price_min: parseAsInteger,
      price_max: parseAsInteger,
      in_stock: parseAsBoolean.withDefault(false),
      sort: parseAsStringLiteral(["newest", "price-asc", "price-desc", "name-asc"]).withDefault("newest"),
      view: parseAsStringLiteral(["grid", "list"]).withDefault("grid"),
      limit: parseAsInteger.withDefault(12),
      page: parseAsInteger.withDefault(1),
      byob: parseAsString,
    },
    {
      clearOnDefault: true,
      history: "replace",
      shallow: false,
    }
  );

  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);

  const rawCategoryParam = searchParams.get("categories") || searchParams.get("category") || searchParams.get("categoryId") || "";

  useEffect(() => {
    const activeCategoryTokens = rawCategoryParam ? rawCategoryParam.split(",") : [];
    
    // Resolve all raw tokens dynamically to unique slugs for absolute UI/Checked safety
    const resolvedSlugs = activeCategoryTokens.flatMap((token) => {
      const match = categories.find((c) => c.slug === token || c.id === token);
      return match ? [match.slug] : [token];
    });

    setSelectedCategorySlugs(resolvedSlugs);
  }, [rawCategoryParam, categories]);

  const activeUrlCategories = selectedCategorySlugs;

  const effectiveSelectedCategories = useMemo(() => {
    const resolvedIds = selectedCategorySlugs.flatMap((token) => {
      const match = categories.find((c) => c.slug === token || c.id === token);
      return match ? [match.id] : [];
    });
    return resolvedIds;
  }, [selectedCategorySlugs, categories]);

  const handleCheckboxToggle = (categorySlug: string) => {
    const targetCategory = categories.find((c) => c.slug === categorySlug);
    if (targetCategory) {
      handleCategoryClick(targetCategory);
    }
  };

  const handleCategoryClick = (category: FilterItem) => {
    const categoryId = category.id;
    const isParent = categories.some(c => c.parentId === categoryId);
    const childrenIds = categories.filter(c => c.parentId === categoryId).map(c => c.id);
    const isCurrentlySelected = effectiveSelectedCategories.includes(categoryId);
    
    let next: string[];
    
    if (isParent) {
      // If parent is being toggled, we want to either select all children or deselect all children
      const allChildrenSelected = childrenIds.every(id => effectiveSelectedCategories.includes(id));
      
      if (allChildrenSelected && isCurrentlySelected) {
        // Deselect parent and all children
        const toRemove = new Set([categoryId, ...childrenIds]);
        next = effectiveSelectedCategories.filter(id => !toRemove.has(id));
      } else {
        // Select parent and all children
        const toAdd = [categoryId, ...childrenIds];
        next = [...new Set([...effectiveSelectedCategories, ...toAdd])];
      }
    } else {
      // Simple child toggle
      if (isCurrentlySelected) {
        next = effectiveSelectedCategories.filter((id) => id !== categoryId);
      } else {
        next = [...effectiveSelectedCategories, categoryId];
      }
      
      // Auto-manage parent state based on children
      const cat = categories.find(c => c.id === categoryId);
      if (cat?.parentId) {
        const siblings = categories.filter(c => c.parentId === cat.parentId).map(c => c.id);
        const allSiblingsSelected = siblings.every(id => 
          id === categoryId ? !isCurrentlySelected : effectiveSelectedCategories.includes(id)
        );
        
        if (allSiblingsSelected) {
          next = [...new Set([...next, cat.parentId])];
        } else {
          next = next.filter(id => id !== cat.parentId);
        }
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("categories");
    params.delete("categoryId");

    if (next.length > 0) {
      const nextSlugs = next.flatMap((id) => {
        const resolved = categories.find((c) => c.id === id);
        return resolved ? [resolved.slug] : [id];
      });

      if (nextSlugs.length === 1) {
        params.set("category", nextSlugs[0]);
      } else {
        params.set("categories", nextSlugs.join(","));
      }
    }
    
    params.set("page", "1"); // Reset pagination

    router.push(`${pathname}?${params.toString()}`);
  };

  const [priceRange, setPriceRange] = useState<[number, number]>([
    queryState.price_min ?? PRICE_MIN,
    queryState.price_max ?? PRICE_MAX,
  ]);

  useEffect(() => {
    setPriceRange([queryState.price_min ?? PRICE_MIN, queryState.price_max ?? PRICE_MAX]);
  }, [queryState.price_min, queryState.price_max]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void setQueryState({
        price_min: priceRange[0] <= PRICE_MIN ? null : priceRange[0],
        price_max: priceRange[1] >= PRICE_MAX ? null : priceRange[1],
        page: 1,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [priceRange, setQueryState]);

  const toggleFilter = (value: typeof QUICK_FILTERS[number]["value"]) => {
    void setQueryState({
      filter: queryState.filter === value ? null : value,
      page: 1,
    });
  };

  const resetAllFilters = () => {
    void setQueryState({
      categories: null,
      category: null,
      occasion: null,
      recipient: null,
      mood: null,
      filter: null,
      price_min: null,
      price_max: null,
      in_stock: null,
      sort: "newest",
      page: 1,
      byob: null,
    });
    setPriceRange([PRICE_MIN, PRICE_MAX]);
  };

  const activeCount = useMemo(() => {
    let count = 0;
    if (effectiveSelectedCategories.length > 0) count += 1;
    if (queryState.occasion) count += 1;
    if (queryState.recipient) count += 1;
    if (queryState.mood) count += 1;
    if (queryState.filter) count += 1;
    if (queryState.in_stock) count += 1;
    if (queryState.price_min !== null || queryState.price_max !== null) count += 1;
    return count;
  }, [effectiveSelectedCategories.length, queryState.filter, queryState.in_stock, queryState.mood, queryState.occasion, queryState.price_max, queryState.price_min]);

  const toggleCategory = (categoryId: string) => {
    const isParent = categories.some(c => c.parentId === categoryId);
    const childrenIds = categories.filter(c => c.parentId === categoryId).map(c => c.id);
    const isCurrentlySelected = effectiveSelectedCategories.includes(categoryId);
    
    let next: string[];
    
    if (isParent) {
      // If parent is being toggled, we want to either select all children or deselect all children
      const allChildrenSelected = childrenIds.every(id => effectiveSelectedCategories.includes(id));
      
      if (allChildrenSelected && isCurrentlySelected) {
        // Deselect parent and all children
        const toRemove = new Set([categoryId, ...childrenIds]);
        next = effectiveSelectedCategories.filter(id => !toRemove.has(id));
      } else {
        // Select parent and all children
        const toAdd = [categoryId, ...childrenIds];
        next = [...new Set([...effectiveSelectedCategories, ...toAdd])];
      }
    } else {
      // Simple child toggle
      if (isCurrentlySelected) {
        next = effectiveSelectedCategories.filter((id) => id !== categoryId);
      } else {
        next = [...effectiveSelectedCategories, categoryId];
      }
      
      // Auto-manage parent state based on children
      const category = categories.find(c => c.id === categoryId);
      if (category?.parentId) {
        const siblings = categories.filter(c => c.parentId === category.parentId).map(c => c.id);
        const allSiblingsSelected = siblings.every(id => 
          id === categoryId ? !isCurrentlySelected : effectiveSelectedCategories.includes(id)
        );
        
        if (allSiblingsSelected) {
          next = [...new Set([...next, category.parentId])];
        } else {
          next = next.filter(id => id !== category.parentId);
        }
      }
    }

    void setQueryState({ 
      categories: next.length > 0 ? next : null, 
      categoryId: next.length > 0 ? next[0] : null,
      category: null, 
      page: 1 
    });
  };

  const setOccasion = (value: string | null) => void setQueryState({ occasion: value, page: 1 });
  const setRecipient = (value: string | null) => void setQueryState({ recipient: value, page: 1 });
  const setMood = (value: string | null) => void setQueryState({ mood: value, page: 1 });
  const setInStock = (value: boolean) => void setQueryState({ in_stock: value ? true : null, page: 1 });

  // Build explicit tree from flat categories array.
  const rootCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const getChildren = useMemo(
    () => (parentId: string) => categories.filter((category) => category.parentId === parentId),
    [categories]
  );

  const renderFilterPanel = () => (
    <div className="space-y-6">
      {/* Quick Filters removed as requested */}

      {/* Reset Button */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-pink-100 bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-600 transition-colors hover:bg-pink-100"
        >
          <X className="w-4 h-4" /> {t("resetAllFilters", { count: activeCount })}
        </button>
      )}

      <section className="space-y-3 pt-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-4">{t("categories")}</h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("category");
              params.delete("categories");
              params.delete("categoryId");
              params.set("page", "1");
              router.push(`${pathname}?${params.toString()}`);
            }}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selectedCategorySlugs.length === 0
                ? "border-pink-500 bg-pink-50 text-pink-600 font-medium"
                : "border-gray-100 bg-white text-gray-600 hover:border-pink-500 hover:text-pink-600"
              }`}
          >
            {t("allCategories")}
          </button>
          <ScrollArea className={cn(categories.length > 8 ? "h-[300px]" : "h-auto", "pr-4")}>
            <div className="space-y-2">
              {rootCategories.map((rootCategory) => {
                const children = getChildren(rootCategory.id);
                const hasChildren = children.length > 0;
                
                const isRootActive = activeUrlCategories.includes(rootCategory.slug);
                const activeChildrenCount = children.filter((child) => activeUrlCategories.includes(child.slug)).length;
                const isFullyChecked = isRootActive;
                const isIndeterminate = hasChildren && !isRootActive && activeChildrenCount > 0 && activeChildrenCount < children.length;

                return (
                  <Collapsible key={rootCategory.id} defaultOpen={activeChildrenCount > 0 || isRootActive}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between w-full group">
                        <div className="flex items-center gap-2 py-1">
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              id={rootCategory.id}
                              checked={activeUrlCategories.includes(rootCategory.slug)}
                              ref={(el) => {
                                if (el) el.indeterminate = isIndeterminate;
                              }}
                              onChange={() => handleCheckboxToggle(rootCategory.slug)}
                              className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 accent-pink-600 cursor-pointer" 
                            />
                          </div>
                          <span 
                            onClick={() => handleCheckboxToggle(rootCategory.slug)}
                            className={`text-sm transition-colors cursor-pointer select-none ${
                              isFullyChecked || isIndeterminate ? "text-pink-600 font-semibold" : "text-gray-700 hover:text-pink-600"
                            }`}
                          >
                            {rootCategory.name}
                          </span>
                        </div>
                        {hasChildren && (
                          <CollapsibleTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors group/trigger">
                              <ChevronDown className="w-4 h-4 text-gray-400 group-hover/trigger:text-gray-600 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                        )}
                      </div>

                      {hasChildren && (
                        <CollapsibleContent>
                          <div className="pl-6 space-y-1 mb-2 border-l border-gray-100 ml-2">
                            {children.map((childCategory) => {
                              const isChildActive = activeUrlCategories.includes(childCategory.slug);
                              return (
                                <button
                                  key={childCategory.id}
                                  type="button"
                                  onClick={() => handleCheckboxToggle(childCategory.slug)}
                                  className={`flex w-full items-center justify-between py-1 text-sm transition-colors ${
                                    isChildActive ? "text-pink-600 font-medium" : "text-gray-500 hover:text-pink-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="checkbox" 
                                      id={childCategory.id}
                                      readOnly 
                                      checked={activeUrlCategories.includes(childCategory.slug)} 
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 accent-pink-600" 
                                    />
                                    <span>{childCategory.name}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-5">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-4">{t("occasions")}</h3>
        <ScrollArea className={cn(occasions.length > 6 ? "h-[220px]" : "h-auto", "pr-4")}>
          <div className="space-y-2">
            {occasions.map((item) => {
              const isActive = queryState.occasion === item.slug;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOccasion(isActive ? null : item.slug)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-pink-500 bg-pink-50 text-pink-600 font-medium"
                      : "border-gray-100 bg-white text-gray-600 hover:border-pink-500 hover:text-pink-600"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-5">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-4">{t("recipients")}</h3>
        <ScrollArea className={cn(recipients.length > 6 ? "h-[220px]" : "h-auto", "pr-4")}>
          <div className="space-y-2">
            {recipients.map((item) => {
              const isActive = queryState.recipient === item.slug;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRecipient(isActive ? null : item.slug)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-pink-500 bg-pink-50 text-pink-600 font-medium"
                      : "border-gray-100 bg-white text-gray-600 hover:border-pink-500 hover:text-pink-600"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </section>

      {/* 
      <section className="space-y-3 border-t border-gray-100 pt-5">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-4">Moods</h3>
        <div className="space-y-2">
          {moods.map((item) => {
            const isActive = queryState.mood === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMood(isActive ? null : item.slug)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "border-pink-500 bg-pink-50 text-pink-600 font-medium"
                    : "border-gray-100 bg-white text-gray-600 hover:border-pink-500 hover:text-pink-600"
                }`}
              >
                <span className="mr-2">{item.icon || "✨"}</span>
                {item.name}
              </button>
            );
          })}
        </div>
      </section>
      */}

      <section className="space-y-4 border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">{t("priceRange")}</h3>
          <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
            LKR {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
          </span>
        </div>
        <Slider
          value={priceRange}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={250}
          onValueChange={(value) => setPriceRange([value[0] ?? PRICE_MIN, value[1] ?? PRICE_MAX])}
          className="py-2 accent-pink-600"
        />
      </section>

      {!hideOutOfStock && (
        <section className="space-y-3 border-t border-gray-100 pt-5">
          <h3 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">{t("availability")}</h3>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 bg-white">
            <span className="text-sm text-gray-700">{t("inStockOnly")}</span>
            <Switch checked={Boolean(queryState.in_stock)} onCheckedChange={setInStock} className="data-[state=checked]:bg-pink-600" />
          </div>
        </section>
      )}
    </div>
  );

  return (
    <>
      <aside className="relative hidden h-fit bg-white border-r border-gray-100 p-5 xl:sticky xl:top-24 xl:block min-w-[280px]">
        {renderFilterPanel()}
      </aside>

      <div className="xl:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="fixed bottom-6 left-1/2 z-40 h-11 -translate-x-1/2 rounded-full bg-pink-600 px-6 text-white shadow-lg shadow-pink-600/30 hover:bg-pink-700 transition-all active:scale-95"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t("sortFilter")}
              {activeCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-pink-600">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-none pb-8 shadow-2xl">
            <SheetHeader className="border-b border-gray-100 pb-4 mb-6">
              <SheetTitle className="flex items-center gap-2 text-gray-900">
                <Filter className="h-4 w-4 text-pink-600" />
                {t("refineProducts")}
              </SheetTitle>
              <SheetDescription>{t("adjustFiltersDesc")}</SheetDescription>
            </SheetHeader>
            <div className="px-1">{renderFilterPanel()}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
