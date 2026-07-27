"use client";

import Image from "next/image";
import { Product } from "@/types/box-builder";
import { useBoxBuilderStore } from "@/store/boxBuilder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { 
    addItem, 
    incrementItem, 
    decrementItem, 
    getItemQuantity
  } = useBoxBuilderStore();

  const quantity = getItemQuantity(product.id);
  const { formatPrice } = useCurrency();

  return (
    <Card className="group relative h-full flex flex-col border-brand-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
       <CardContent className="p-0 flex-1 flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-[#FCEAF4]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Content Area (Grows to fill space) */}
        <div className="p-4 flex-1 flex flex-col gap-1">
          <div className="flex-1">
            <h3 className="font-bold text-[#1F1720] text-sm line-clamp-2 min-h-[40px]">
              {product.name}
            </h3>
            
            <p className="text-[#A7066A] font-bold text-lg mt-1">
              {formatPrice(product.price)}
            </p>
          </div>
 
          {/* Footer Area (Pushed to bottom) */}
          <div className="mt-auto pt-4">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-[#FCEAF4] rounded-full p-1 border border-[#EBC9DB]">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 rounded-full hover:bg-white text-[#A7066A]"
                  onClick={() => decrementItem(product.id)}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-bold text-[#A7066A]">{quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 rounded-full hover:bg-white text-[#A7066A]"
                  onClick={() => incrementItem(product.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                className="w-full rounded-full bg-[#A7066A] hover:bg-[#8B0557] text-white"
                onClick={() => addItem(product)}
              >
                Add to Box
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
