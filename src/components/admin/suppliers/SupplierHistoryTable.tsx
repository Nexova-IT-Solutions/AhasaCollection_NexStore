"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductSupply } from "@/types/supplier";

interface SupplierHistoryTableProps {
  supplierId: string;
  initialHistory: ProductSupply[];
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function SupplierHistoryTable({
  supplierId,
  initialHistory,
}: SupplierHistoryTableProps) {
  const [history, setHistory] = useState<ProductSupply[]>(initialHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialHistory.length);
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchPage = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/admin/suppliers/${supplierId}/supply-history?page=${targetPage}&limit=${limit}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json();
          setHistory(data.history ?? []);
          setTotal(data.total ?? 0);
          setPage(data.page ?? targetPage);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    },
    [supplierId]
  );

  const handlePrev = () => {
    if (page > 1) fetchPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) fetchPage(page + 1);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-brand-border">
              <TableHead className="font-semibold text-[#6B5A64]">Product Name</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Cost Price</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Supplied Date</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (history.length === 0 && page === 1) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <History className="w-12 h-12 text-[#A7066A]/20 mb-4" />
          <p className="text-[#6B5A64] font-medium mb-1">
            No supply history recorded yet
          </p>
          <p className="text-sm text-[#6B5A64]/70">
            Supply records are created when you set a supply date on a product
            update.
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
              <TableHead className="font-semibold text-[#6B5A64]">
                Product Name
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Cost Price
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Supplied Date
              </TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">
                Notes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow
                key={entry.id}
                className="hover:bg-[#FAFAFA]/50 transition-colors"
              >
                <TableCell>
                  <span className="font-semibold text-[#1F1720]">
                    {entry.product?.name ?? "Unknown Product"}
                  </span>
                </TableCell>
                <TableCell className="text-[#6B5A64]">
                  {entry.costPrice != null
                    ? `LKR ${entry.costPrice.toLocaleString()}`
                    : "—"}
                </TableCell>
                <TableCell className="text-[#6B5A64] text-sm">
                  {formatDateTime(entry.suppliedAt)}
                </TableCell>
                <TableCell className="text-[#6B5A64] text-sm max-w-[300px] truncate">
                  {entry.notes || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-3">
          <p className="text-sm text-[#6B5A64]">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page <= 1}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm font-medium text-[#1F1720] px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page >= totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
