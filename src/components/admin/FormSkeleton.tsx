import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FormSkeletonProps = {
  maxWidthClass?: string;
  pageClassName?: string;
  fieldCount?: number;
  showSecondaryButton?: boolean;
};

export function FormSkeleton({
  maxWidthClass = "max-w-[1600px]",
  pageClassName = "w-full bg-[#FAFAFA] min-h-screen py-12 px-4 sm:px-6 lg:px-8",
  fieldCount = 6,
  showSecondaryButton = true,
}: FormSkeletonProps) {
  return (
    <div className={pageClassName}>
      <div className={cn("mx-auto space-y-8", maxWidthClass)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-72 skeleton-shimmer" />
          <Skeleton className="h-10 w-32 rounded-full skeleton-shimmer" />
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-6 md:p-8 shadow-sm space-y-6">
          <Skeleton className="h-8 w-64 skeleton-shimmer" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: fieldCount }).map((_, index) => (
              <div key={index} className={index === fieldCount - 1 ? "md:col-span-2 space-y-2" : "space-y-2"}>
                <Skeleton className="h-4 w-28 skeleton-shimmer" />
                <Skeleton className="h-11 w-full rounded-xl skeleton-shimmer" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
            {showSecondaryButton ? <Skeleton className="h-11 w-32 rounded-xl skeleton-shimmer" /> : null}
            <Skeleton className="h-11 w-44 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
