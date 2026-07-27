import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Skeleton } from "@/components/ui/skeleton";

function ProductDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-48 rounded bg-[#F3EDF1]" />
      <div className="grid gap-10 lg:grid-cols-2 2xl:grid-cols-[1.08fr_0.92fr] 2xl:gap-14">
        <section className="space-y-4">
          <Skeleton className="aspect-square rounded-2xl bg-[#F3EDF1]" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-xl bg-[#F3EDF1]" />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-4/5 rounded bg-[#F3EDF1]" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-36 rounded bg-[#F3EDF1]" />
              <Skeleton className="h-6 w-24 rounded-full bg-[#F3EDF1]" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded bg-[#F3EDF1]" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-20 rounded-lg bg-[#F3EDF1]" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded bg-[#F3EDF1]" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-20 rounded-lg bg-[#F3EDF1]" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded bg-[#F3EDF1]" />
            <Skeleton className="h-12 w-40 rounded-xl bg-[#F3EDF1]" />
          </div>

          <Skeleton className="h-12 w-full rounded-xl bg-[#F3EDF1]" />

          <div className="space-y-3 border-t border-brand-border pt-6">
            <Skeleton className="h-4 w-48 rounded bg-[#F3EDF1]" />
            <Skeleton className="h-4 w-full rounded bg-[#F3EDF1]" />
            <Skeleton className="h-4 w-5/6 rounded bg-[#F3EDF1]" />
            <Skeleton className="h-4 w-2/3 rounded bg-[#F3EDF1]" />
          </div>
        </section>
      </div>
    </div>
  )
}

export default function ProductLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 py-10 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <ProductDetailSkeleton />
      </main>
      <Footer />
    </div>
  );
}
