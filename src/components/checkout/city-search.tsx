"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface CitySearchResult {
  id: string;
  cityName: string;
  provinceId: string;
  provinceName: string;
  fee: number;
}

interface CitySearchProps {
  value: string;
  onChange: (cityName: string, provinceName: string, fee: number) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  className?: string;
}

export function CitySearch({
  value,
  onChange,
  placeholder = "Search and select city...",
  error,
  id,
  className,
}: CitySearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<CitySearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shipping-cities/search?q=${encodeURIComponent(search.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setResults(json.data);
          }
        }
      } catch (err) {
        console.error("Error fetching cities:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // When popover closes, reset search query
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch("");
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between border-brand-border text-left font-normal bg-white h-10 px-3",
              !value && "text-muted-foreground",
              error && "border-red-500 focus-visible:ring-red-500",
              "rounded-md"
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false} className="w-full">
            <CommandInput
              placeholder="Type at least 2 characters..."
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList className="max-h-[300px]">
              {loading && (
                <div className="flex items-center justify-center py-6 text-sm text-[#6B5A64]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#A7066A]" />
                  Searching cities...
                </div>
              )}
              {!loading && search.trim().length >= 2 && results.length === 0 && (
                <CommandEmpty>No cities found.</CommandEmpty>
              )}
              {search.trim().length < 2 && (
                <div className="py-6 text-center text-sm text-[#6B5A64]">
                  Type at least 2 characters to search...
                </div>
              )}
              <CommandGroup>
                {results.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.cityName}
                    onSelect={() => {
                      onChange(city.cityName, city.provinceName, city.fee);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center justify-between py-2 px-3 cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 truncate">
                        {city.cityName}
                      </span>
                      <span className="text-xs text-[#6B5A64] truncate">
                        {city.provinceName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {city.fee > 0 ? `LKR ${city.fee.toLocaleString()}` : "Free Delivery"}
                      </Badge>
                      {value === city.cityName && (
                        <Check className="h-4 w-4 text-[#A7066A]" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive mt-1 pointer-events-none">{error}</p>}
    </div>
  );
}
