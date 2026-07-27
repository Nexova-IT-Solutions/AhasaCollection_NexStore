export function ProductsGridSkeleton() {
  return (
    <section className="relative min-h-[520px] animate-pulse">
      <div className="h-5 w-40 rounded bg-[#F3EDF1] mb-4" />
      <div className="grid grid-cols-1 gap-4 p-4 xs:grid-cols-2 xs:gap-3 xs:p-3 md:grid-cols-3 md:p-0 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 9 }).map((_, index) => (
          <article key={index} className="overflow-hidden rounded-2xl border border-brand-border bg-white">
            <div className="aspect-square bg-[#F3EDF1]" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded bg-[#F3EDF1]" />
              <div className="h-5 w-1/2 rounded bg-[#F3EDF1]" />
              <div className="h-4 w-1/3 rounded bg-[#F3EDF1]" />
              <div className="h-10 w-full rounded bg-[#F3EDF1]" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
