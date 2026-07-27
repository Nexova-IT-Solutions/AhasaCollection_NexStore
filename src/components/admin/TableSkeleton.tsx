import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = {
  title: string;
  subtitle: string;
  columns: string[];
  rowCount?: number;
  minTableWidth?: string;
};

export function TableSkeleton({
  title,
  subtitle,
  columns,
  rowCount = 8,
  minTableWidth = "980px",
}: TableSkeletonProps) {
  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8 px-4 md:px-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 skeleton-shimmer" />
            <Skeleton className="h-4 w-80 skeleton-shimmer" />
          </div>
          <Skeleton className="h-11 w-40 rounded-xl skeleton-shimmer" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap" style={{ minWidth: minTableWidth }}>
              <thead className="bg-[#FAFAFA] border-b border-brand-border text-[#6B5A64]">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column}
                      className={`px-6 py-4 font-semibold ${index === columns.length - 1 ? "text-right" : ""}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column, colIndex) => (
                      <td
                        key={`${column}-${rowIndex}`}
                        className={`px-6 py-4 ${colIndex === columns.length - 1 ? "text-right" : ""}`}
                      >
                        {colIndex === columns.length - 1 ? (
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
                            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
                          </div>
                        ) : colIndex === 0 ? (
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg skeleton-shimmer" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-28 skeleton-shimmer" />
                              <Skeleton className="h-3 w-20 skeleton-shimmer" />
                            </div>
                          </div>
                        ) : (
                          <Skeleton className="h-4 w-24 skeleton-shimmer" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sr-only">
          {title} {subtitle}
        </div>
      </div>
    </div>
  );
}
