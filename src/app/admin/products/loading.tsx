import React from "react";

export default function AdminProductsLoading() {
  const columns = ["Identity", "SKU", "Placement", "Valuation", "Availability", "Attributes", "Actions"];
  const rows = Array.from({ length: 10 });

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-12 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 space-y-6">
        
        {/* Top actions/filters skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="h-11 w-80 bg-gray-200 rounded-xl" />
          <div className="h-11 w-44 bg-gray-200 rounded-xl" />
        </div>

        {/* Toolbar skeleton */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded-md" />
            <div className="h-4 w-96 bg-gray-100 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-gray-100 rounded-xl" />
            <div className="h-10 w-28 bg-gray-100 rounded-xl" />
          </div>
        </div>

        {/* Filters panel placeholder */}
        <div className="h-20 w-full bg-white border border-gray-150 rounded-[2rem] p-4 flex gap-4 items-center">
          <div className="h-10 w-full bg-gray-50 rounded-xl" />
          <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-150 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA] border-b border-gray-150 text-slate-400">
                <tr>
                  {columns.map((col, index) => (
                    <th 
                      key={index} 
                      className={`px-8 py-6 font-bold uppercase tracking-widest text-[11px] ${index === columns.length - 1 ? "text-right" : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((_, rowIndex) => (
                  <tr key={rowIndex} className="bg-white">
                    
                    {/* Identity */}
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-200 shrink-0" />
                        <div className="space-y-2">
                          <div className="h-4 w-44 bg-gray-200 rounded-md" />
                          <div className="h-3 w-28 bg-gray-100 rounded-md" />
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-8 py-4">
                      <div className="h-5 w-20 bg-gray-100 rounded-md" />
                    </td>

                    {/* Placement */}
                    <td className="px-8 py-4">
                      <div className="h-6 w-24 bg-gray-100 rounded-full" />
                    </td>

                    {/* Valuation */}
                    <td className="px-8 py-4">
                      <div className="space-y-1.5">
                        <div className="h-5 w-20 bg-gray-200 rounded-md" />
                        <div className="h-3.5 w-16 bg-gray-100 rounded-md" />
                      </div>
                    </td>

                    {/* Availability */}
                    <td className="px-8 py-4">
                      <div className="space-y-1.5">
                        <div className="h-4 w-16 bg-gray-200 rounded-md" />
                        <div className="h-3 w-24 bg-gray-100 rounded-md" />
                        <div className="h-5 w-12 bg-gray-100 rounded-md mt-1" />
                      </div>
                    </td>

                    {/* Attributes */}
                    <td className="px-8 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <div className="h-5 w-12 bg-gray-100 rounded-full" />
                        <div className="h-5 w-16 bg-gray-100 rounded-full" />
                        <div className="h-5 w-14 bg-gray-100 rounded-full" />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg" />
                        <div className="w-9 h-9 bg-gray-100 rounded-lg" />
                        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                      </div>
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
