import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Building2 } from "lucide-react";
import { SupplierTable } from "@/components/admin/suppliers/SupplierTable";
import type { Supplier } from "@/types/supplier";
import { hasPermission } from "@/lib/permissions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, "catalog.manage_inventory")) {
    redirect("/admin");
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page as string || "1") || 1;
  const limit = parseInt(resolvedParams.limit as string || "10") || 10;

  let suppliers: Supplier[] = [];
  let totalCount = 0;

  try {
    const [rawSuppliers, count] = await Promise.all([
      db.supplier.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { products: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supplier.count(),
    ]);
    totalCount = count;
    suppliers = rawSuppliers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-6 px-4 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FCEAF4] rounded-xl">
              <Building2 className="w-6 h-6 text-[#A7066A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F1720]">
                Supplier Management
              </h1>
              <p className="text-[#6B5A64] mt-1">
                Manage your product suppliers, contacts, and assignments.
              </p>
            </div>
          </div>
        </div>

        <SupplierTable 
          initialSuppliers={suppliers} 
          totalCount={totalCount}
          currentPage={page}
          limit={limit}
        />
      </div>
    </div>
  );
}
