export default function DenominationsLoading() {
  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-[1000px] mx-auto space-y-8">
        {/* Title Header */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="h-4 w-96 bg-gray-100 rounded-md" />
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column Skeleton */}
          <div className="space-y-6 lg:col-span-1">
            {/* Form Card Skeleton */}
            <div className="rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-sm">
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-gray-200 rounded-md" />
                  <div className="h-3 w-48 bg-gray-100 rounded-md" />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-gray-100 rounded-md" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 bg-gray-100 border border-gray-150 rounded-xl" />
                    <div className="h-10 w-16 bg-gray-200 rounded-xl" />
                  </div>
                </div>
                {/* Suggestions skeleton */}
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-32 bg-gray-100 rounded-md" />
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                      <div key={s} className="h-7 w-12 bg-gray-100 border border-gray-150 rounded-md" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card Skeleton */}
            <div className="rounded-2xl border border-gray-150 bg-gray-50/50 p-4 flex gap-3">
              <div className="h-5 w-5 bg-gray-200 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded-md" />
                <div className="h-3 w-full bg-gray-100 rounded-md" />
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-sm">
            {/* Table Header Section */}
            <div className="p-5 bg-gray-50 border-b border-gray-150 space-y-2">
              <div className="h-5 w-48 bg-gray-250 rounded-md" />
              <div className="h-3.5 w-64 bg-gray-100 rounded-md" />
            </div>

            {/* Table Grid */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50/40">
                  {["Value (LKR)", "Classification", "Status", "Toggle Active"].map((col, idx) => (
                    <th key={idx} className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="even:bg-gray-50/40">
                    <td className="py-4 px-6">
                      <div className="h-5 w-20 bg-gray-200 rounded-md" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 w-24 bg-gray-100 border border-gray-150 rounded-md" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 w-16 bg-gray-200 rounded-md" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-block h-8 w-14 bg-gray-100 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
