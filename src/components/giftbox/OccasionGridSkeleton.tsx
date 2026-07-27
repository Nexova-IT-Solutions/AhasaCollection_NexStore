import { Skeleton } from "@/components/ui/skeleton";

export function OccasionGridSkeleton({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Title Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-[#F3EDF1]" />
          <div className="h-4 w-80 rounded bg-[#F3EDF1]" />
        </div>

        {/* Compact Grid - Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex-shrink-0 w-32">
              <div className="aspect-square rounded-xl bg-[#F3EDF1]" />
              <div className="space-y-2 mt-3">
                <div className="h-4 w-full rounded bg-[#F3EDF1]" />
                <div className="h-3 w-2/3 rounded bg-[#F3EDF1]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default grid version
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-[#F3EDF1]" />
        <div className="h-4 w-80 rounded bg-[#F3EDF1]" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-start">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-brand-border bg-white">
            <div className="aspect-square bg-[#F3EDF1]" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 rounded bg-[#F3EDF1]" />
              <div className="h-4 w-1/2 rounded bg-[#F3EDF1]" />
              <div className="h-3 w-2/3 rounded bg-[#F3EDF1]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
