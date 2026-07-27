export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-6 pb-6 animate-pulse">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-80 bg-gray-100 rounded-md" />
        </div>
        <div className="h-10 w-44 bg-gray-250 rounded-xl" />
      </div>

      {/* Categories Tree View Skeleton */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-150 overflow-hidden">
        {/* Table Title Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <div className="h-4 w-28 bg-gray-200 rounded-md" />
        </div>

        {/* Tree Rows */}
        <div className="divide-y divide-gray-100">
          {[
            { level: 0, hasChildren: true },
            { level: 1, hasChildren: false },
            { level: 2, hasChildren: false },
            { level: 1, hasChildren: true },
            { level: 2, hasChildren: false },
            { level: 0, hasChildren: false },
            { level: 0, hasChildren: true },
            { level: 1, hasChildren: false },
          ].map((row, index) => (
            <div
              key={index}
              className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 even:bg-gray-50/40"
              style={{ paddingLeft: `${24 + row.level * 28}px` }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Expand icon placeholder */}
                {row.hasChildren ? (
                  <div className="h-7 w-7 rounded-md border border-gray-150 bg-gray-50 flex-shrink-0" />
                ) : (
                  <div className="h-7 w-7 flex-shrink-0" />
                )}

                {/* Category Image placeholder */}
                <div className="w-12 h-12 rounded-md border border-gray-150 bg-gray-100 flex-shrink-0" />

                {/* Category Name & Slug placeholder */}
                <div className="space-y-2 min-w-0">
                  <div className="h-5 w-40 bg-gray-200 rounded-md" />
                  <div className="h-3.5 w-24 bg-gray-100 rounded-md" />
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Live/Hidden Status Tag placeholder */}
                <div className="h-7 w-16 bg-gray-200 rounded-md" />

                {/* Show in Trending Switch placeholder */}
                <div className="h-8 w-36 bg-gray-100 rounded-md border border-gray-150" />

                {/* Edit/Delete Buttons placeholders */}
                <div className="flex items-center gap-1">
                  <div className="h-9 w-9 bg-gray-100 rounded-xl" />
                  <div className="h-9 w-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-gray-100 bg-white">
          <div className="h-5 w-64 bg-gray-200 rounded-md" />
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
  );
}
