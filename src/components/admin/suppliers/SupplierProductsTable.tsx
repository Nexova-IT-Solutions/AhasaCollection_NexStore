"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Pencil } from "lucide-react";

interface LinkedProduct {
  id: string;
  name: string;
  stock: number;
  costPrice?: number | null;
  lastSuppliedAt?: string | null;
  productImages: unknown;
}

interface SupplierProductsTableProps {
  products: LinkedProduct[];
  isLoading?: boolean;
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

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function SupplierProductsTable({
  products,
  isLoading,
}: SupplierProductsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-brand-border">
              <TableHead className="font-semibold text-[#6B5A64] w-16">Image</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Product Name</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Stock</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Cost Price</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Last Supplied</TableHead>
              <TableHead className="font-semibold text-[#6B5A64] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-[#A7066A]/20 mb-4" />
          <p className="text-[#6B5A64] font-medium mb-1">
            No products linked to this supplier
          </p>
          <p className="text-sm text-[#6B5A64]/70">
            Assign this supplier to products via the product edit form.
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
              <TableHead className="font-semibold text-[#6B5A64] w-16">Image</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Product Name</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Stock</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Cost Price</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Last Supplied</TableHead>
              <TableHead className="font-semibold text-[#6B5A64] text-right">Actions</TableHead>
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
                        <Package className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#1F1720]">
                      {product.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.stock <= 0 ? (
                      <Badge variant="destructive" className="font-semibold">
                        Out of Stock
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-semibold">
                        {product.stock}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[#6B5A64]">
                    {product.costPrice != null
                      ? `LKR ${product.costPrice.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-[#6B5A64] text-sm">
                    {formatDate(product.lastSuppliedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Link href={`/en/admin/products/${product.id}/edit`}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
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
