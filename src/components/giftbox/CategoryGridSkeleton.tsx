import { Skeleton } from "@/components/ui/skeleton";

export function CategoryGridSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-[#F3EDF1]" />
        <div className="h-4 w-80 rounded bg-[#F3EDF1]" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-center justify-items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-brand-border bg-white">
            <div className="aspect-square bg-[#F3EDF1]" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 rounded bg-[#F3EDF1]" />
              <div className="h-4 w-1/2 rounded bg-[#F3EDF1]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
