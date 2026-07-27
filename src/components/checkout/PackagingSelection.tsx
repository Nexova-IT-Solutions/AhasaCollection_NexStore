"use client";

import React from "react";
import { useCartStore, PACKAGING_OPTIONS, PackagingOption } from "@/store/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Box, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PackagingSelection() {
  const { selectedPackaging, setPackaging } = useCartStore();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Leaf":
        return <Leaf className="w-5 h-5" />;
      case "Box":
        return <Box className="w-5 h-5" />;
      default:
        return <Box className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1F1720]">Select Packaging Option</h3>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black text-[#A7066A] border-[#FCEAF4] bg-[#FCEAF4]/30">
          Required
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PACKAGING_OPTIONS.map((option) => {
          const isSelected = selectedPackaging.id === option.id;
          return (
            <Card 
              key={option.id}
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all border-2 rounded-2xl group",
                isSelected 
                  ? "border-[#A7066A] bg-[#FCEAF4]/20 shadow-lg shadow-[#A7066A]/5" 
                  : "border-slate-100 hover:border-fuchsia-200 bg-white"
              )}
              onClick={() => setPackaging(option)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-[#A7066A] text-white" : "bg-slate-50 text-slate-400 group-hover:bg-fuchsia-50 group-hover:text-[#A7066A]"
                )}>
                  {getIcon(option.icon || "")}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "font-bold text-sm",
                      isSelected ? "text-slate-900" : "text-slate-600"
                    )}>
                      {option.name}
                    </p>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#A7066A] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{option.description}</p>
                </div>
              </CardContent>
              
              {isSelected && (
                <div className="absolute top-0 left-0 w-full h-1 bg-[#A7066A]" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
