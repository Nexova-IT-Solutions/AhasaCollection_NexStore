export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6 pb-6 animate-pulse">
      {/* Top Title Section */}
      <div className="space-y-2">
        <div className="h-8 w-60 bg-gray-200 rounded-lg" />
        <div className="h-4 w-96 bg-gray-100 rounded-md" />
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-150 bg-white p-5 flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-24 bg-gray-200 rounded-md" />
              <div className="h-7 w-28 bg-gray-200 rounded-lg" />
              <div className="h-3.5 w-36 bg-gray-100 rounded-md" />
            </div>
            <div className="rounded-2xl p-3 bg-gray-100 h-11 w-11" />
          </div>
        ))}
      </div>

      {/* Orders Table Container Card */}
      <div className="rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-sm">
        <div className="p-5 space-y-5">
          {/* Actions & Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr]">
              <div className="h-11 bg-gray-100 border border-gray-150 rounded-xl" />
              <div className="h-11 bg-gray-100 border border-gray-150 rounded-xl" />
              <div className="h-11 bg-gray-100 border border-gray-150 rounded-xl" />
              <div className="h-11 bg-gray-100 border border-gray-150 rounded-xl" />
            </div>
            <div className="h-11 w-36 bg-gray-100 border border-gray-150 rounded-xl shrink-0" />
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50">
                  {["Order #", "Date", "Customer", "Type", "Items", "Total", "Payment", "Status", "Actions"].map((col, index) => (
                    <th key={index} className="py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5, 6].map((row) => (
                  <tr key={row} className="even:bg-gray-50/40">
                    {/* Order # */}
                    <td className="py-4 px-6">
                      <div className="h-5 w-24 bg-gray-200 rounded-md" />
                    </td>
                    {/* Date */}
                    <td className="py-4 px-6">
                      <div className="h-5 w-32 bg-gray-200 rounded-md" />
                    </td>
                    {/* Customer */}
                    <td className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="h-4 w-28 bg-gray-200 rounded-md" />
                        <div className="h-3 w-36 bg-gray-100 rounded-md" />
                      </div>
                    </td>
                    {/* Type */}
                    <td className="py-4 px-6">
                      <div className="h-5 w-16 bg-gray-100 rounded-md border border-gray-150" />
                    </td>
                    {/* Items */}
                    <td className="py-4 px-6">
                      <div className="h-5 w-14 bg-gray-200 rounded-md" />
                    </td>
                    {/* Total */}
                    <td className="py-4 px-6">
                      <div className="h-5 w-20 bg-gray-200 rounded-md" />
                    </td>
                    {/* Payment Status */}
                    <td className="py-4 px-6">
                      <div className="h-6 w-20 bg-gray-100 rounded-full" />
                    </td>
                    {/* Order Status */}
                    <td className="py-4 px-6">
                      <div className="h-6 w-20 bg-gray-100 rounded-full" />
                    </td>
                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-block h-8 w-8 bg-gray-100 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer Skeleton */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-gray-100 bg-white">
            <div className="h-5 w-60 bg-gray-200 rounded-md" />
            <div className="flex items-center gap-1">
              <div className="h-8 w-8 bg-gray-100 rounded-md border border-gray-150" />
              <div className="h-8 w-8 bg-gray-100 rounded-md border border-gray-150" />
              <div className="h-8 w-8 bg-gray-200 rounded-md" />
              <div className="h-8 w-8 bg-gray-100 rounded-md border border-gray-150" />
              <div className="h-8 w-8 bg-gray-100 rounded-md border border-gray-150" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
