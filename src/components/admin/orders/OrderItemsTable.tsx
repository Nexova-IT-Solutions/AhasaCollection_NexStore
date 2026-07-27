"use client";

import { useState } from "react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReturnItemModal } from "./ReturnItemModal";
import { formatPriceClient } from "@/lib/currency-client"; // using client formatter if exists, or simple formatter

// Simple currency formatter since we are on client side
const formatCurr = (val: number) => `OMR ${val.toFixed(3)}`;

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  returnedQuantity: number;
  sku: string | null;
  unitPrice: number;
  salePrice: number | null;
  discountName: string | null;
  discountValue: number | null;
  subtotal: number;
}

interface OrderItemsTableProps {
  orderId: string;
  items: OrderItem[];
}

export function OrderItemsTable({ items, orderId }: OrderItemsTableProps) {
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [optimisticReturned, setOptimisticReturned] = useState<Record<string, number>>({});

  return (
    <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
      <CardHeader className="p-0 mb-1.5 bg-transparent">
        <CardTitle className="text-base font-bold text-[#1F1720]">Order Items</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              let displayName = item.productName;
              let selectedVariantName = null;
              
              const dashIndex = item.productName.lastIndexOf(" - ");
              if (dashIndex > 0) {
                displayName = item.productName.substring(0, dashIndex);
                selectedVariantName = item.productName.substring(dashIndex + 3);
              }

              const actualReturnedQty = item.returnedQuantity || 0;
              const optimisticQty = optimisticReturned[item.id] || 0;
              const effectiveReturnedQty = Math.max(actualReturnedQty, optimisticQty);
              
              const canReturn = item.quantity - effectiveReturnedQty > 0;

              return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                      {item.productImage ? (
                        <Image src={item.productImage} alt={displayName} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-[#1F1720]">{displayName}</p>
                      {selectedVariantName ? (
                        <p className="text-xs text-neutral-500">Variant: {selectedVariantName}</p>
                      ) : (
                        <p className="text-xs text-[#6B5A64]">Line item</p>
                      )}
                      {effectiveReturnedQty > 0 && (
                        <Badge variant="destructive" className="mt-1 text-[10px] py-0 px-1.5 bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">
                          {effectiveReturnedQty} Returned
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[#6B5A64]">
                  {item.quantity}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#6B5A64]">{item.sku || "-"}</TableCell>
                <TableCell className="text-[#6B5A64]">{formatCurr(item.salePrice || item.unitPrice)}</TableCell>
                <TableCell className="text-[#6B5A64]">
                  {item.discountName ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-emerald-700">{item.discountName}</p>
                      <p className="text-xs text-emerald-700">{item.discountValue ? `${item.discountValue}%` : "Applied"}</p>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold text-[#1F1720]">{formatCurr(item.subtotal)}</TableCell>
                <TableCell className="text-right pr-6">
                  {canReturn ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedItem(item)}
                      className="text-xs border-[#A7066A] text-[#A7066A] hover:bg-[#FCEAF4] h-7"
                    >
                      Return
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Fully Returned</span>
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {selectedItem && (
        <ReturnItemModal 
          isOpen={!!selectedItem} 
          onClose={() => setSelectedItem(null)} 
          orderId={orderId} 
          item={selectedItem} 
          onSuccess={(qty) => {
            setOptimisticReturned(prev => ({
              ...prev,
              [selectedItem.id]: Math.max(selectedItem.returnedQuantity || 0, prev[selectedItem.id] || 0) + qty
            }));
          }}
        />
      )}
    </Card>
  );
}
