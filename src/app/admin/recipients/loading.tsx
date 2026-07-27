export default function RecipientsLoading() {
  return (
    <div className="space-y-8 pb-12 animate-pulse w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-60 bg-gray-200 rounded-lg" />
            <div className="h-4 w-96 bg-gray-100 rounded-md" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-gray-100 border border-gray-150 rounded-xl" />
            <div className="h-10 w-44 bg-gray-200 rounded-xl" />
          </div>
        </div>

        {/* Recipients Table Card */}
        <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-150">
              <tr>
                {["Name", "Slug", "Active", "Actions"].map((col, idx) => (
                  <th key={idx} className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="even:bg-gray-50/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-gray-200 rounded-full" />
                      <div className="h-5 w-24 bg-gray-200 rounded-md" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-20 bg-gray-100 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 w-24 bg-gray-50 border border-gray-150 rounded-lg" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-14 bg-gray-100 rounded-md" />
                      <div className="h-8 w-20 bg-gray-100 rounded-md" />
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
