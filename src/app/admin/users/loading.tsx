import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8 px-4 md:px-8 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 skeleton-shimmer" />
            <Skeleton className="h-4 w-80 skeleton-shimmer" />
          </div>
          <Skeleton className="h-11 w-40 rounded-full skeleton-shimmer" />
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 w-fit rounded-2xl border border-gray-200 shadow-inner">
          <Skeleton className="h-10 w-36 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-10 w-28 rounded-xl skeleton-shimmer" />
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl border border-brand-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#FAFAFA] border-b border-brand-border text-[#6B5A64]">
                <tr>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px]">Name</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px]">Email</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px]">Role</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px]">Status</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px]">Joined</th>
                  <th className="px-8 py-6 font-bold uppercase tracking-widest text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full skeleton-shimmer" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32 skeleton-shimmer" />
                          <Skeleton className="h-3 w-24 skeleton-shimmer" />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><Skeleton className="h-4 w-52 skeleton-shimmer" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-24 rounded-full skeleton-shimmer" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-4 w-28 skeleton-shimmer" /></td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-9 w-9 rounded-lg skeleton-shimmer" />
                        <Skeleton className="h-9 w-9 rounded-lg skeleton-shimmer" />
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
