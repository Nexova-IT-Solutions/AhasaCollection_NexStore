import { Skeleton } from "@/components/ui/skeleton";

export default function AddressesLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* Addresses Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
