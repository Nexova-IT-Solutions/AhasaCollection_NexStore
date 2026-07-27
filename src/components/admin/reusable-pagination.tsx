"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReusablePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  pageParamKey?: string;
  limitParamKey?: string;
}

export function ReusablePagination({
  totalItems,
  itemsPerPage,
  currentPage,
  pageParamKey = "page",
  limitParamKey = "limit",
}: ReusablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageParamKey, pageNumber.toString());
    params.set(limitParamKey, itemsPerPage.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    router.push(createPageUrl(pageNumber));
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(limitParamKey, newLimit.toString());
    params.set(pageParamKey, "1"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, safeCurrentPage - 2);
      let end = Math.min(totalPages, safeCurrentPage + 2);

      if (start === 1) {
        end = 5;
      } else if (end === totalPages) {
        start = totalPages - 4;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const startRecord = (safeCurrentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-slate-100 bg-white rounded-b-2xl select-none">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{totalItems === 0 ? 0 : startRecord}</span> to{" "}
          <span className="font-semibold text-slate-800">{endRecord}</span> of{" "}
          <span className="font-semibold text-[#A7066A]">{totalItems}</span> records
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#A7066A] focus:ring-1 focus:ring-[#A7066A] transition-all cursor-pointer"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-[#A7066A] hover:bg-[#FCEAF4]/30 border-slate-200"
          onClick={() => handlePageChange(1)}
          disabled={safeCurrentPage <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-[#A7066A] hover:bg-[#FCEAF4]/30 border-slate-200"
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Chips */}
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === safeCurrentPage ? "default" : "outline"}
            className={`h-8 w-8 text-xs font-semibold rounded-md transition-all ${
              page === safeCurrentPage
                ? "bg-[#A7066A] hover:bg-[#8A0558] text-white shadow-sm"
                : "text-slate-600 hover:text-[#A7066A] hover:bg-[#FCEAF4]/30 border-slate-200"
            }`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </Button>
        ))}

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-[#A7066A] hover:bg-[#FCEAF4]/30 border-slate-200"
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-[#A7066A] hover:bg-[#FCEAF4]/30 border-slate-200"
          onClick={() => handlePageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
