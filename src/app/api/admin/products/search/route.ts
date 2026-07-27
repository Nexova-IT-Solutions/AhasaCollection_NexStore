import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  discountPercentage: number | null;
  stockQuantity: number;
  isActive: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isSpecialDiscount: boolean;
  isPremiumGiftBox: boolean;
  createdAt: Date;
  category: { id: string; name: string } | null;
  productImages: { url: string; altText: string | null }[];
  sizes: string[];
  colors: string[];
  occasions: { id: string; name: string }[];
};

type CountRow = { count: bigint };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const categoryId = searchParams.get("categoryId")?.trim() || "";
    const pageRaw = Number(searchParams.get("page"));
    const pageSizeRaw = Number(searchParams.get("pageSize"));
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(Math.floor(pageSizeRaw), 50) : 20;
    const skip = (page - 1) * pageSize;

    if (q && q.length < 3) {
      return NextResponse.json({ products: [], total: 0, page, pageSize, totalPages: 0 });
    }

    const searchCondition = q
      ? Prisma.sql`AND (p.name ILIKE ${"%" + q + "%"} OR c.name ILIKE ${"%" + q + "%"})`
      : Prisma.sql``;

    const categoryCondition = categoryId
      ? Prisma.sql`AND p."categoryId" = ${categoryId}`
      : Prisma.sql``;

    const products = await db.$queryRaw<ProductRow[]>`
      SELECT
        p.id,
        p.name,
        p.name AS slug,
        p.price AS "basePrice",
        p."salePrice",
        CASE
          WHEN p."salePrice" IS NOT NULL AND p.price > p."salePrice"
          THEN ROUND(((p.price - p."salePrice") / p.price) * 100)::int
          ELSE NULL
        END AS "discountPercentage",
        p.stock AS "stockQuantity",
        p."isActive",
        p."isNewArrival",
        p."isTrending",
        p."showInDiscountSection" AS "isSpecialDiscount",
        p."isPremiumGiftBox",
        p."createdAt",
        p.sizes,
        p.colors,
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object('id', c.id, 'name', c.name)
        END AS category,
        COALESCE(
          (
            SELECT json_agg(json_build_object('url', pi.url, 'altText', pi."altText"))
            FROM (
              SELECT pi.url, pi."altText"
              FROM jsonb_to_recordset(COALESCE(p."productImages"::jsonb, '[]'::jsonb)) AS pi(url text, "altText" text, "isPrimary" boolean, "isMain" boolean)
              WHERE COALESCE(pi."isPrimary", pi."isMain", false) = true
              LIMIT 1
            ) pi
          ),
          '[]'::json
        ) AS "productImages",
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', o.id, 'name', o.name))
            FROM "_OccasionToProduct" op
            JOIN "Occasion" o ON o.id = op."A"
            WHERE op."B" = p.id
          ),
          '[]'::json
        ) AS occasions
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE 1=1
      ${searchCondition}
      ${categoryCondition}
      ORDER BY p."createdAt" DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const countResult = await db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS count
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE 1=1
      ${searchCondition}
      ${categoryCondition}
    `;

    const total = countResult.length > 0 ? Number(countResult[0].count) : 0;

    const mappedProducts = products.map((product) => ({
      ...product,
      price: product.basePrice,
      stock: product.stockQuantity,
      showInDiscountSection: product.isSpecialDiscount,
      productImages: Array.isArray(product.productImages) ? product.productImages : [],
      occasions: Array.isArray(product.occasions) ? product.occasions : [],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      colors: Array.isArray(product.colors) ? product.colors : [],
    }));

    return NextResponse.json({
      products: mappedProducts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin product search failed", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}