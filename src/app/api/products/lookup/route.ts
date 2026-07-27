import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products/lookup?sku=[value]
 * POS-ready product lookup by SKU — no auth required (read-only).
 */
export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku");

  if (!sku || !sku.trim()) {
    return NextResponse.json({ error: "SKU required" }, { status: 400 });
  }

  try {
    const product = await db.product.findUnique({
      where: { sku: sku.trim().toUpperCase() },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        productImages: true,
        category: { select: { name: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[products/lookup] Error:", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}
