import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN"];

/**
 * GET /api/admin/reports/inventory/out-of-stock
 *
 * Returns list of products with stock <= 0.
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

    const products = await db.product.findMany({
      where: {
        stock: { lte: 0 },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        category: {
          select: {
            name: true,
          },
        },
        supplier: {
          select: {
            name: true,
            contactName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      total: products.length,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "N/A",
        price: p.price,
        salePrice: p.salePrice || null,
        stock: p.stock,
        categoryName: p.category?.name || "Uncategorized",
        supplierName: p.supplier?.name || "No Supplier Assigned",
        supplierContact: p.supplier?.contactName || null,
        supplierPhone: p.supplier?.phoneNumber || null,
      })),
    });
  } catch (error: any) {
    console.error("[Reports Out of Stock] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
