import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-5">
      {/* Page Title Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Search Input Skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Status Tabs Skeleton */}
      <div className="flex gap-2 overflow-hidden py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Order Cards Skeleton List */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Order Card Header */}
            <div className="space-y-3 border-b border-gray-100 p-6 pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Order Card Content (Items) */}
            <div className="p-6 space-y-4">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>

            {/* Order Card Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 p-6 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
