export default function DiscountsLoading() {
  return (
    <div className="space-y-8 animate-pulse w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="h-8 w-60 bg-gray-200 rounded-lg" />
          <div className="h-4 w-96 bg-gray-100 rounded-md" />
        </div>

        {/* Create / Edit Form Card */}
        <div className="rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-sm">
          <div className="p-6 space-y-6">
            <div className="h-5 w-40 bg-gray-200 rounded-md" />
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <div className="h-3.5 w-16 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="h-3.5 w-24 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="space-y-2">
                <div className="h-3.5 w-16 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="space-y-2">
                <div className="h-3.5 w-16 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="space-y-2">
                <div className="h-3.5 w-20 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="space-y-2">
                <div className="h-3.5 w-20 bg-gray-150 rounded-md" />
                <div className="h-10 w-full bg-gray-50 border border-gray-150 rounded-xl" />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-1">
                <div className="h-6 w-11 bg-gray-250 rounded-full" />
                <div className="h-4 w-32 bg-gray-200 rounded-md" />
              </div>

              <div className="md:col-span-2 flex gap-3 pt-3">
                <div className="h-10 w-36 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Discounts Table Card */}
        <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-150 bg-gray-50/50">
            <div className="h-5 w-36 bg-gray-250 rounded-md" />
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-150">
              <tr>
                {["Name", "Type", "Value", "Status", "Linked Products", "Date Range", "Actions"].map((col, idx) => (
                  <th key={idx} className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3].map((row) => (
                <tr key={row} className="even:bg-gray-50/40">
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="h-4.5 w-40 bg-gray-200 rounded-md" />
                      <div className="h-3.5 w-60 bg-gray-100 rounded-md" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-16 bg-gray-150 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-14 bg-gray-200 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-16 bg-gray-100 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-8 bg-gray-150 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-44 bg-gray-100 rounded-md" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-14 bg-gray-100 rounded-md" />
                      <div className="h-8 w-16 bg-gray-100 rounded-md" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
