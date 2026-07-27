import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OutOfStockTable } from "@/components/admin/inventory/OutOfStockTable";
import type { OutOfStockProduct } from "@/types/supplier";

export const dynamic = "force-dynamic";

export default async function OutOfStockPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role as string)
  ) {
    redirect("/");
  }

  let products: OutOfStockProduct[] = [];

  try {
    const rawProducts = await db.product.findMany({
      where: { stock: { lte: 0 } },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        costPrice: true,
        categoryId: true,
        category: {
          select: { name: true },
        },
        supplier: {
          select: { name: true },
        },
        productImages: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    products = rawProducts.map((p) => ({
      ...p,
      updatedAt: p.updatedAt.toISOString(),
    }));
    products.forEach(p => console.log(`PRODUCT LOG: ${p.name} - Price: ${p.price}`));
    console.log("DEBUG OUT OF STOCK PRODUCTS[0]:", JSON.stringify(products[0], null, 2));
  } catch (error) {
    console.error("Failed to fetch out-of-stock products:", error);
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-6 px-4 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F1720] flex items-center gap-3">
                Out-of-Stock Report
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  {products.length} item{products.length !== 1 ? "s" : ""} out
                  of stock
                </Badge>
              </h1>
              <p className="text-[#6B5A64] mt-1">
                Products that need immediate restocking attention.
              </p>
            </div>
          </div>
        </div>

        <OutOfStockTable products={products} />
      </div>
    </div>
  );
}
