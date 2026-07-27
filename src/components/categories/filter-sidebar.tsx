"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type FilterOption = {
  id: string;
  name: string;
  slug: string;
};

type FilterSidebarProps = {
  recipients: FilterOption[];
  occasions: FilterOption[];
};

const MIN_PRICE = 0;
const MAX_PRICE = 50000;

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toCsv(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.join(",");
}

function toggleValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

export function FilterSidebar({ recipients, occasions }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const selectedRecipients = useMemo(
    () => parseCsvParam(searchParams.get("recipients")),
    [searchParams]
  );
  const selectedOccasions = useMemo(
    () => parseCsvParam(searchParams.get("occasions")),
    [searchParams]
  );
  const sort = searchParams.get("sort") || "newest";
  const min = Number(searchParams.get("min") || MIN_PRICE);
  const max = Number(searchParams.get("max") || MAX_PRICE);

  const activeFiltersCount =
    (selectedRecipients.length > 0 ? 1 : 0) +
    (selectedOccasions.length > 0 ? 1 : 0) +
    (sort !== "newest" ? 1 : 0) +
    (min !== MIN_PRICE || max !== MAX_PRICE ? 1 : 0);

  const pushParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const updateSort = (value: string) => {
    pushParams((params) => {
      if (value === "newest") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
    });
  };

  const updateRecipients = (slug: string) => {
    pushParams((params) => {
      const next = toggleValue(selectedRecipients, slug);
      const nextCsv = toCsv(next);
      if (nextCsv) {
        params.set("recipients", nextCsv);
      } else {
        params.delete("recipients");
      }
    });
  };

  const updateOccasions = (slug: string) => {
    pushParams((params) => {
      const next = toggleValue(selectedOccasions, slug);
      const nextCsv = toCsv(next);
      if (nextCsv) {
        params.set("occasions", nextCsv);
      } else {
        params.delete("occasions");
      }
    });
  };

  const updatePriceRange = (nextMin: number, nextMax: number) => {
    pushParams((params) => {
      if (nextMin <= MIN_PRICE) {
        params.delete("min");
      } else {
        params.set("min", String(nextMin));
      }

      if (nextMax >= MAX_PRICE) {
        params.delete("max");
      } else {
        params.set("max", String(nextMax));
      }
    });
  };

  const clearAll = () => {
    pushParams((params) => {
      params.delete("min");
      params.delete("max");
      params.delete("sort");
      params.delete("recipients");
      params.delete("occasions");
    });
  };

  const panel = (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1F1720]">Sort By</h3>
          {activeFiltersCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs text-[#A7066A] hover:bg-[#FCEAF4]"
              onClick={clearAll}
            >
              Clear All Filters
            </Button>
          ) : null}
        </div>
        <Select value={sort} onValueChange={updateSort}>
          <SelectTrigger className="w-full border-brand-border">
            <SelectValue placeholder="Select sorting" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3 border-t border-brand-border pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1F1720]">Price Range</h3>
          <span className="text-xs text-[#6B5A64]">
            LKR {min.toLocaleString()} - {max.toLocaleString()}
          </span>
        </div>

        <Slider
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={250}
          value={[min, max]}
          onValueCommit={(values) => {
            const nextMin = values[0] ?? MIN_PRICE;
            const nextMax = values[1] ?? MAX_PRICE;
            updatePriceRange(Math.min(nextMin, nextMax), Math.max(nextMin, nextMax));
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={MIN_PRICE}
            max={MAX_PRICE}
            value={min}
            onChange={(event) => {
              const nextMin = Number(event.target.value || MIN_PRICE);
              updatePriceRange(Math.min(nextMin, max), max);
            }}
            className="border-brand-border"
            placeholder="Min"
          />
          <Input
            type="number"
            min={MIN_PRICE}
            max={MAX_PRICE}
            value={max}
            onChange={(event) => {
              const nextMax = Number(event.target.value || MAX_PRICE);
              updatePriceRange(min, Math.max(nextMax, min));
            }}
            className="border-brand-border"
            placeholder="Max"
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-brand-border pt-5">
        <h3 className="text-sm font-semibold text-[#1F1720]">Recipients</h3>
        <div className="space-y-2">
          {recipients.length > 0 ? (
            recipients.map((recipient) => (
              <label
                key={recipient.id}
                className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm text-[#3A2B35]"
              >
                <Checkbox
                  checked={selectedRecipients.includes(recipient.slug)}
                  onCheckedChange={() => updateRecipients(recipient.slug)}
                />
                <span>{recipient.name}</span>
              </label>
            ))
          ) : (
            <p className="text-sm text-[#6B5A64]">No recipients available.</p>
          )}
        </div>
      </section>

      <section className="space-y-3 border-t border-brand-border pt-5">
        <h3 className="text-sm font-semibold text-[#1F1720]">Occasions</h3>
        <div className="space-y-2">
          {occasions.length > 0 ? (
            occasions.map((occasion) => (
              <label
                key={occasion.id}
                className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm text-[#3A2B35]"
              >
                <Checkbox
                  checked={selectedOccasions.includes(occasion.slug)}
                  onCheckedChange={() => updateOccasions(occasion.slug)}
                />
                <span>{occasion.name}</span>
              </label>
            ))
          ) : (
            <p className="text-sm text-[#6B5A64]">No occasions available.</p>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:sticky lg:top-24 h-fit rounded-2xl border border-brand-border bg-white p-5">
        {panel}
      </aside>

      <div className="lg:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#A7066A] px-5 text-white hover:bg-[#8A0558]"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 ? (
                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#A7066A]">
                  {activeFiltersCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Refine Gift Boxes</SheetTitle>
              <SheetDescription>Adjust filters and results update instantly.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">{panel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
