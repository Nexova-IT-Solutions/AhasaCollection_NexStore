"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Romantic",
  "Wedding",
  "Corporate",
  "Just Because"
];

interface FilterSidebarProps {
  search: string;
  setSearch: (val: string) => void;
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  selectedOccasions: string[];
  setOccasions: (val: string[]) => void;
}

export const FilterSidebar = ({
  search,
  setSearch,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedOccasions,
  setOccasions
}: FilterSidebarProps) => {
  
  const handleOccasionChange = (occasion: string, checked: boolean) => {
    if (checked) {
      setOccasions([...selectedOccasions, occasion]);
    } else {
      setOccasions(selectedOccasions.filter(o => o !== occasion));
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full md:w-64">
      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-[#1F1720]">Search Products</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5A64]" />
          <Input 
            placeholder="Search items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 border-brand-border focus:ring-[#A7066A]"
          />
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-4">
        <Label className="text-sm font-bold text-[#1F1720]">Price Range (LKR)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#6B5A64] uppercase font-bold">Min</span>
            <Input 
              type="number" 
              placeholder="0" 
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 border-brand-border"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#6B5A64] uppercase font-bold">Max</span>
            <Input 
              type="number" 
              placeholder="5000" 
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 border-brand-border"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Occasions */}
      <div className="space-y-4">
        <Label className="text-sm font-bold text-[#1F1720]">Occasions</Label>
        <div className="flex flex-col gap-3">
          {OCCASIONS.map((occasion) => (
            <div key={occasion} className="flex items-center space-x-2">
              <Checkbox 
                id={occasion} 
                checked={selectedOccasions.includes(occasion)}
                onCheckedChange={(checked) => handleOccasionChange(occasion, checked as boolean)}
                className="border-brand-border data-[state=checked]:bg-[#A7066A] data-[state=checked]:border-[#A7066A]"
              />
              <Label 
                htmlFor={occasion}
                className="text-sm font-medium text-[#6B5A64] cursor-pointer hover:text-[#A7066A] transition-colors"
              >
                {occasion}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
