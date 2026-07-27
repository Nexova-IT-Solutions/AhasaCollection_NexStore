import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Security Alert Skeleton */}
      <Skeleton className="h-24 w-full rounded-3xl" />

      {/* Billing Addresses Section */}
      <div className="space-y-6">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
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

      {/* Payment Methods Section */}
      <div className="mt-12 pt-12 border-t border-gray-50 space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="p-12 border border-dashed border-gray-200 rounded-3xl">
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
