"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageX } from "lucide-react";
import type { OutOfStockProduct } from "@/types/supplier";

interface OutOfStockTableProps {
  products: OutOfStockProduct[];
}

function getFirstImageUrl(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const img of images) {
    if (img && typeof img === "object") {
      const candidate = img as { url?: unknown };
      if (typeof candidate.url === "string" && candidate.url.trim()) {
        return candidate.url;
      }
    }
  }
  return null;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function OutOfStockTable({ products }: OutOfStockTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageX className="w-16 h-16 text-emerald-300 mb-4" />
          <p className="text-lg font-semibold text-[#1F1720] mb-1">
            All products are in stock!
          </p>
          <p className="text-sm text-[#6B5A64]">
            Great job — no items need restocking right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-brand-border">
              <TableHead className="font-semibold text-[#6B5A64] w-16">
                Image
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Product Name
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Category
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Item Price
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Stock
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Last Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const imageUrl = getFirstImageUrl(product.productImages);

              return (
                <TableRow
                  key={product.id}
                  className="hover:bg-[#FAFAFA]/50 transition-colors"
                >
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <PackageX className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#1F1720]">
                      {product.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#6B5A64]">
                    {product.category?.name || "—"}
                  </TableCell>
                  <TableCell className="text-[#6B5A64]">
                    {product.price != null
                      ? `LKR ${product.price.toLocaleString()}`
                      : "P: —"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="font-semibold">
                      Out of Stock
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#6B5A64] text-sm">
                    {formatDate(product.updatedAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
