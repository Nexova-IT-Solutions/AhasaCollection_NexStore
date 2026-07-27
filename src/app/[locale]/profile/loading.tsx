import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileRootLoading() {
  return (
    <div className="space-y-8">
      {/* Greeting Skeleton */}
      <div>
        <Skeleton className="h-8 w-72 rounded-xl" />
        <Skeleton className="h-4 w-96 mt-2 rounded-lg" />
      </div>

      {/* Primary Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-6 rounded-3xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between h-[180px]">
            <div className="space-y-4">
              <Skeleton className="h-3 w-32 rounded-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-40 rounded-lg" />
              </div>
              {i === 2 && <Skeleton className="h-4 w-28 rounded-lg mt-2" />}
            </div>
            <div className="pt-4 border-t border-gray-200/50">
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-50">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 items-start p-6 rounded-3xl border border-transparent">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Recently Viewed Products Skeleton */}
      <div className="space-y-5 pt-6">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
