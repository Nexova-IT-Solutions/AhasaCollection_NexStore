import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

import { getReportOutletFilter } from "@/lib/report-outlet-filter";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN"];

/**
 * GET /api/admin/reports/inventory/audit
 *
 * Returns raw product list with categories and suppliers for local grouping,
 * sorting, and multi-tier drilling in stock audit sheets.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const outletFilter = await getReportOutletFilter(req);

    const productWhere: any = {
      isActive: true,
    };

    if (outletFilter.effectiveOutletId) {
      productWhere.outletId = outletFilter.effectiveOutletId;
    }

    const products = await db.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        price: true,
        costPrice: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
        repository: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { category: { name: "asc" } },
        { name: "asc" },
      ],
    });

    const auditRecords = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || "N/A",
      stock: p.stock,
      price: p.price,
      costPrice: p.costPrice || 0,
      categoryId: p.category?.id || "uncategorized",
      categoryName: p.category?.name || "Uncategorized",
      supplierId: p.supplier?.id || "no-supplier",
      supplierName: p.supplier?.name || "No Supplier Assigned",
      outletId: p.outlet?.id || "no-outlet",
      outletName: p.outlet?.name || "—",
      repositoryId: p.repository?.id || "no-repository",
      repositoryName: p.repository?.name || "—",
    }));

    return NextResponse.json({
      success: true,
      totalItems: auditRecords.length,
      products: auditRecords,
    });
  } catch (error: any) {
    console.error("[Reports Stock Audit] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
