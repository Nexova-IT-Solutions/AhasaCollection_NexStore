"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  totalPages: number;
  currentPage: number;
};

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  // Logic to show a limited number of page buttons
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end === totalPages) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <Link
        href={createPageURL(currentPage - 1)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white transition-colors hover:bg-brand-light hover:text-brand-primary",
          currentPage <= 1 && "pointer-events-none opacity-50"
        )}
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page) => (
          <Link
            key={page}
            href={createPageURL(page)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border transition-colors text-sm font-medium",
              currentPage === page
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border bg-white hover:bg-brand-light hover:text-brand-primary"
            )}
          >
            {page}
          </Link>
        ))}
      </div>

      <Link
        href={createPageURL(currentPage + 1)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white transition-colors hover:bg-brand-light hover:text-brand-primary",
          currentPage >= totalPages && "pointer-events-none opacity-50"
        )}
        aria-disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
