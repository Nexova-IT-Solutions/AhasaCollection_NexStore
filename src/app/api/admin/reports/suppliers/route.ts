import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/admin/reports/suppliers
 *
 * Supplier-wise Products Report API
 * Protect strictly with permission check.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session, "reports.supplier_products")) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const suppliers = await db.supplier.findMany({
      where: {
        isActive: true,
      },
      include: {
        products: {
          select: {
            id: true,
            stock: true,
            costPrice: true,
          },
        },
      },
    });

    const supplierData = suppliers.map((s) => {
      const totalUniqueProducts = s.products.length;
      const totalItemsInStock = s.products.reduce((sum, p) => sum + p.stock, 0);
      const totalStockValue = Math.round(
        s.products.reduce((sum, p) => sum + (p.stock * (p.costPrice || 0)), 0) * 100
      ) / 100;

      return {
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email || "N/A",
        phoneNumber: s.phoneNumber || "N/A",
        address: s.address || "N/A",
        totalUniqueProducts,
        totalItemsInStock,
        totalStockValue,
      };
    });

    return NextResponse.json({
      success: true,
      suppliers: supplierData,
    });
  } catch (error: any) {
    console.error("[Supplier Products Report API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
