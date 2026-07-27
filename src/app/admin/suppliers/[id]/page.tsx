import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Building2, Mail, Phone, MapPin, User, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierProductsTable } from "@/components/admin/suppliers/SupplierProductsTable";
import { SupplierHistoryTable } from "@/components/admin/suppliers/SupplierHistoryTable";

type PageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role as string)
  ) {
    redirect("/");
  }

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          stock: true,
          costPrice: true,
          lastSuppliedAt: true,
          productImages: true,
        },
      },
      supplyHistory: {
        include: { product: { select: { id: true, name: true } } },
        orderBy: { suppliedAt: "desc" },
        take: 50,
      },
      _count: { select: { products: true } },
    },
  });

  if (!supplier) {
    notFound();
  }

  const serializedProducts = supplier.products.map((p) => ({
    ...p,
    lastSuppliedAt: p.lastSuppliedAt?.toISOString() ?? null,
  }));

  const serializedHistory = supplier.supplyHistory.map((h) => ({
    id: h.id,
    productId: h.productId,
    supplierId: h.supplierId,
    suppliedAt: h.suppliedAt.toISOString(),
    costPrice: h.costPrice,
    notes: h.notes,
    product: h.product,
  }));

  const infoCards = [
    {
      label: "Contact Name",
      value: supplier.contactName,
      icon: User,
    },
    {
      label: "Email",
      value: supplier.email || "—",
      icon: Mail,
    },
    {
      label: "Phone",
      value: supplier.phoneNumber || "—",
      icon: Phone,
    },
    {
      label: "Address",
      value: supplier.address || "—",
      icon: MapPin,
    },
    {
      label: "Total Products",
      value: String(supplier._count.products),
      icon: Package,
    },
  ];

  return (
    <div className="w-full bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-6 px-4 md:px-8 lg:px-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FCEAF4] rounded-xl">
              <Building2 className="w-6 h-6 text-[#A7066A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F1720] flex items-center gap-3">
                {supplier.name}
                <Badge
                  className={
                    supplier.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }
                >
                  {supplier.isActive ? "Active" : "Inactive"}
                </Badge>
              </h1>
              <p className="text-[#6B5A64] mt-1">
                Supplier details, linked products, and supply history.
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {infoCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4 text-[#A7066A]" />
                <span className="text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className="text-sm font-medium text-[#1F1720] truncate">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-white border border-brand-border rounded-xl p-1 mb-4">
            <TabsTrigger
              value="products"
              className="rounded-lg data-[state=active]:bg-[#A7066A] data-[state=active]:text-white px-4"
            >
              <Package className="w-4 h-4 mr-2" />
              Linked Products ({supplier._count.products})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg data-[state=active]:bg-[#A7066A] data-[state=active]:text-white px-4"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Supply History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <SupplierProductsTable products={serializedProducts} />
          </TabsContent>

          <TabsContent value="history">
            <SupplierHistoryTable
              supplierId={supplier.id}
              initialHistory={serializedHistory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
