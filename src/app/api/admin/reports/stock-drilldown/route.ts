import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const QuerySchema = z.object({
  level: z.enum(["categories", "subs", "products"]),
  parentId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    // }

    // if (!hasPermission(session, "reports.stock_audit")) {
    //   return NextResponse.json({ success: false, message: "Forbidden: Insufficient privileges" }, { status: 403 });
    // }

    const { searchParams } = new URL(req.url);
    const rawLevel = searchParams.get("level");
    const rawParentId = searchParams.get("parentId") || undefined;

    const validation = QuerySchema.safeParse({
      level: rawLevel,
      parentId: rawParentId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { level, parentId } = validation.data;

    if (level === "categories") {
      // 1. Fetch active root categories along with their immediate active subcategories in one query
      const categories = await db.category.findMany({
        where: { parentId: null, isActive: true },
        include: {
          subCategories: {
            where: { isActive: true },
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      });

      // 2. Localize product scanning inside Prisma boundary to category tree members
      const allTargetCategoryIds = categories.flatMap((cat) => [
        cat.id,
        ...cat.subCategories.map((sub) => sub.id),
      ]);

      const products = await db.product.findMany({
        where: {
          categoryId: { in: allTargetCategoryIds },
          isActive: true,
        },
        select: { categoryId: true, stock: true, price: true, costPrice: true },
      });

      // 3. Perform dynamic rollups for root levels
      const result = categories.map((cat) => {
        const catSubIds = cat.subCategories.map((sub) => sub.id);
        const allCatIds = [cat.id, ...catSubIds];

        const catProducts = products.filter(
          (p) => p.categoryId && allCatIds.includes(p.categoryId)
        );

        const totalStock = catProducts.reduce((sum, p) => sum + p.stock, 0);
        const totalCost = catProducts.reduce((sum, p) => sum + (p.costPrice || 0) * p.stock, 0);
        const totalRetailValue = catProducts.reduce((sum, p) => sum + p.price * p.stock, 0);

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          type: "category",
          hasChildren: cat.subCategories.length > 0 || catProducts.length > 0,
          totalStock,
          totalCost: Math.round(totalCost * 100) / 100,
          avgPrice: Math.round(totalRetailValue * 100) / 100, // Mapped to avgPrice key for interface compatibility
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (level === "subs") {
      if (!parentId) {
        return NextResponse.json({ success: false, message: "parentId is required for level=subs" }, { status: 400 });
      }

      // 1. Fetch active sub-categories under the specific root category
      const subCategories = await db.category.findMany({
        where: { parentId: parentId, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              subCategories: true,
              products: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // 2. Fetch products structurally isolated strictly by subcategory IDs
      const subCategoryIds = subCategories.map((sub) => sub.id);
      const products = await db.product.findMany({
        where: {
          categoryId: { in: subCategoryIds },
          isActive: true,
        },
        select: { categoryId: true, stock: true, price: true, costPrice: true },
      });

      // 3. Compute accurate subcategory rollup calculations
      const result = subCategories.map((sub) => {
        const subProducts = products.filter((p) => p.categoryId === sub.id);

        const totalStock = subProducts.reduce((sum, p) => sum + p.stock, 0);
        const totalCost = subProducts.reduce((sum, p) => sum + (p.costPrice || 0) * p.stock, 0);
        const totalRetailValue = subProducts.reduce((sum, p) => sum + p.price * p.stock, 0);

        return {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          type: "subcategory",
          hasChildren: sub._count.subCategories > 0 || sub._count.products > 0,
          totalStock,
          totalCost: Math.round(totalCost * 100) / 100,
          avgPrice: Math.round(totalRetailValue * 100) / 100, // Mapped to avgPrice for interface compatibility
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (level === "products") {
      if (!parentId) {
        return NextResponse.json({ success: false, message: "parentId is required for level=products" }, { status: 400 });
      }

      // Fetch products directly linked to parentId
      const products = await db.product.findMany({
        where: { categoryId: parentId, isActive: true },
        include: {
          discount: true,
        },
        orderBy: { name: "asc" },
      });

      const result = products.map((prod) => {
        const now = new Date();
        let isDiscountActive = false;
        let computedSalePrice = prod.price;

        if (prod.discount && prod.discount.isActive) {
          const startsVal = prod.discount.startsAt ? new Date(prod.discount.startsAt) : null;
          const endsVal = prod.discount.endsAt ? new Date(prod.discount.endsAt) : null;

          const started = !startsVal || startsVal <= now;
          const notEnded = !endsVal || endsVal >= now;

          if (started && notEnded) {
            isDiscountActive = true;
            if (prod.discount.type === "PERCENTAGE") {
              computedSalePrice = prod.price - prod.price * (prod.discount.value / 100);
            } else if (prod.discount.type === "FIXED") {
              computedSalePrice = Math.max(0, prod.price - prod.discount.value);
            }
          }
        }

        return {
          id: prod.id,
          sku: prod.sku || "N/A",
          name: prod.name,
          costPrice: prod.costPrice || null,
          basePrice: prod.price,
          salePrice: computedSalePrice,
          isDiscountActive,
          discountValue: isDiscountActive && prod.discount ? prod.discount.value : 0,
          discountType: isDiscountActive && prod.discount ? prod.discount.type : null,
          stock: prod.stock,
          type: "product",
          hasChildren: false,
        };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: "Unsupported level" }, { status: 400 });
  } catch (error: any) {
    console.error("[Stock Drilldown API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
