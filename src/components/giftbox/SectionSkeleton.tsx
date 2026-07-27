import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic section skeleton for featured and best seller products
 */
export function SectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-start">
        {Array.from({ length: 5 }).map((_, index) => (
          <article key={index} className="w-full overflow-hidden rounded-2xl border border-brand-border bg-white">
            <Skeleton className="aspect-square w-full rounded-md" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/4 mt-1" />
              <Skeleton className="h-10 w-full rounded-full mt-2" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
