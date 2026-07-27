import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { ProductsGridSkeleton } from "./_components/ProductsGridSkeleton";

export default function CategoriesLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto w-full">
        <div className="space-y-8">
          <div className="h-10 w-80 rounded bg-[#F3EDF1] animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-8 mt-8">
            <aside className="h-[720px] rounded-2xl border border-brand-border bg-white p-5 animate-pulse space-y-4">
              <div className="h-5 w-32 rounded bg-[#F3EDF1]" />
              <div className="h-10 w-full rounded-lg bg-[#F3EDF1]" />
              <div className="h-10 w-full rounded-lg bg-[#F3EDF1]" />
              <div className="h-10 w-full rounded-lg bg-[#F3EDF1]" />
              <div className="h-10 w-full rounded-lg bg-[#F3EDF1]" />
              <div className="h-5 w-40 rounded bg-[#F3EDF1] mt-6" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 rounded-lg bg-[#F3EDF1]" />
                <div className="h-10 rounded-lg bg-[#F3EDF1]" />
              </div>
            </aside>
            <ProductsGridSkeleton />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
