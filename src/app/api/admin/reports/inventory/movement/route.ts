import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN"];

// Sri Lanka is UTC+5:30 (330 minutes ahead of UTC)
const SL_OFFSET_MINUTES = 330;

function slDateToUtc(dateStr: string, endOfDay = false): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const localMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - SL_OFFSET_MINUTES * 60_000;
  return endOfDay ? new Date(localMs + 24 * 60 * 60 * 1000 - 1) : new Date(localMs);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Resolve a variantDetails JSON blob into a human-readable label. */
function buildVariantLabel(variantDetails: unknown): string {
  if (!variantDetails || typeof variantDetails !== "object") return "Standard";
  const obj = variantDetails as Record<string, unknown>;
  if (typeof obj.label === "string" && obj.label.trim()) return obj.label.trim();
  const parts: string[] = [];
  for (const key of ["size", "color", "flavor", "type", "weight", "variant"]) {
    if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
      parts.push((obj[key] as string).trim());
    }
  }
  return parts.length > 0 ? parts.join(" / ") : "Standard";
}

/** Parse productVariants JSON column into stub VariantAggregation entries. */
function extractStaticVariants(productVariantsJson: unknown): VariantAggregation[] {
  if (!productVariantsJson) return [];
  try {
    const arr = Array.isArray(productVariantsJson)
      ? productVariantsJson
      : typeof productVariantsJson === "string"
      ? JSON.parse(productVariantsJson)
      : [];
    return arr.map((v: any) => ({
      variantLabel: buildVariantLabel(v) || v?.name || v?.label || "Variant",
      totalSold: 0,
      revenue: 0,
      discountedValue: 0,
      currentStock: typeof v?.stock === "number" ? v.stock : null,
    }));
  } catch {
    return [];
  }
}

interface VariantAggregation {
  variantLabel: string;
  totalSold: number;
  revenue: number;
  discountedValue: number;
  currentStock: number | null;
}

interface ProductAggregation {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  totalSold: number;
  revenue: number;
  discountedValue: number;
  hasDiscount: boolean;
  supplierName: string | null;
  supplierId: string | null;
  variants: VariantAggregation[];
  lastSuppliedAt?: string | null;
}

/**
 * GET /api/admin/reports/inventory/movement
 *
 * Query params:
 *  startDate     YYYY-MM-DD  (SL local)
 *  endDate       YYYY-MM-DD  (SL local)
 *  limit         number (1-100, default 30)
 *  supplierId    string | ""  — filter by supplier
 *  discountStatus "all" | "discounted" | "regular"
 *  stockStatus    "all" | "in_stock" | "out_of_stock" | "low_stock"
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDateStr   = searchParams.get("startDate");
    const endDateStr     = searchParams.get("endDate");
    const limit          = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "30")));
    const supplierFilter = searchParams.get("supplierId") || "";           // "" = all
    const discountStatus = searchParams.get("discountStatus") || "all";   // "all" | "discounted" | "regular"
    const stockStatus    = searchParams.get("stockStatus") || "all";      // "all" | "in_stock" | "out_of_stock" | "low_stock"
    const LOW_STOCK_THRESHOLD = 5;

    // Default: past 30 days in SL time
    const nowUtc   = new Date();
    const nowSl    = new Date(nowUtc.getTime() + SL_OFFSET_MINUTES * 60_000);
    const todaySl  = nowSl.toISOString().split("T")[0];
    const past30Sl = new Date(nowSl.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const startDate = startDateStr ? slDateToUtc(startDateStr, false) : slDateToUtc(past30Sl, false);
    const endDate   = endDateStr   ? slDateToUtc(endDateStr, true)    : slDateToUtc(todaySl, true);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date format" }, { status: 400 });
    }

    // ─── Fetch active suppliers list (for the filter dropdown) ────────────────
    const suppliers = await db.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // ─── Build product-level WHERE for supplier filter ────────────────────────
    const productSupplierWhere = supplierFilter
      ? { supplierId: supplierFilter }
      : {};

    // ─── Fetch PAID order items in the date range ─────────────────────────────
    const items = await db.orderItem.findMany({
      where: {
        order: {
          createdAt:     { gte: startDate, lte: endDate },
          paymentStatus: "PAID",
        },
        // If supplier filter is set, only include items whose product matches
        ...(supplierFilter
          ? { product: { supplierId: supplierFilter } }
          : {}),
      },
      select: {
        productId:      true,
        productName:    true,
        quantity:       true,
        unitPrice:      true,
        salePrice:      true,
        subtotal:       true,
        discountId:     true,
        discountValue:  true,
        variantDetails: true,
        product: {
          select: {
            id:             true,
            name:           true,
            sku:            true,
            stock:          true,
            price:          true,
            supplierId:     true,
            lastSuppliedAt: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    // ─── Aggregate in-memory ──────────────────────────────────────────────────
    const movementMap = new Map<string, ProductAggregation>();

    for (const item of items) {
      const pid = item.productId;
      if (!pid) continue;

      const itemDiscountValue =
        typeof item.discountValue === "number" && item.discountValue > 0
          ? item.discountValue * item.quantity
          : item.salePrice != null && item.salePrice < item.unitPrice
          ? (item.unitPrice - item.salePrice) * item.quantity
          : 0;

      const hasItemDiscount = itemDiscountValue > 0 || !!item.discountId;
      const variantLabel    = buildVariantLabel(item.variantDetails);

      const existing = movementMap.get(pid);
      if (existing) {
        existing.totalSold       += item.quantity;
        existing.revenue         += item.subtotal;
        existing.discountedValue += itemDiscountValue;
        if (hasItemDiscount) existing.hasDiscount = true;

        const ev = existing.variants.find((v) => v.variantLabel === variantLabel);
        if (ev) {
          ev.totalSold       += item.quantity;
          ev.revenue         += item.subtotal;
          ev.discountedValue += itemDiscountValue;
        } else {
          existing.variants.push({ variantLabel, totalSold: item.quantity, revenue: item.subtotal, discountedValue: itemDiscountValue, currentStock: null });
        }
      } else {
        movementMap.set(pid, {
          productId:       pid,
          name:            item.product?.name || item.productName || "Unknown Product",
          sku:             item.product?.sku  || "N/A",
          stock:           item.product?.stock ?? 0,
          price:           item.product?.price ?? 0,
          totalSold:       item.quantity,
          revenue:         item.subtotal,
          discountedValue: itemDiscountValue,
          hasDiscount:     hasItemDiscount,
          supplierName:    item.product?.supplier?.name ?? null,
          supplierId:      item.product?.supplierId     ?? null,
          variants:        [{ variantLabel, totalSold: item.quantity, revenue: item.subtotal, discountedValue: itemDiscountValue, currentStock: null }],
        });
      }
    }

    // ─── Apply discount & stock filters to fast-moving aggregation ─────────────
    const applyFilters = (rows: ProductAggregation[]): ProductAggregation[] => {
      return rows.filter((p) => {
        // Discount filter
        if (discountStatus === "discounted" && !p.hasDiscount) return false;
        if (discountStatus === "regular"    &&  p.hasDiscount) return false;
        // Stock filter
        if (stockStatus === "in_stock"    && p.stock <= 0)              return false;
        if (stockStatus === "out_of_stock" && p.stock > 0)              return false;
        if (stockStatus === "low_stock"   && (p.stock <= 0 || p.stock > LOW_STOCK_THRESHOLD)) return false;
        return true;
      });
    };

    const fastMoving: ProductAggregation[] = applyFilters(
      Array.from(movementMap.values()).sort((a, b) => b.totalSold - a.totalSold)
    )
      .slice(0, limit)
      .map((item) => ({
        ...item,
        revenue:         round2(item.revenue),
        discountedValue: round2(item.discountedValue),
        variants:        item.variants
          .sort((a, b) => b.totalSold - a.totalSold)
          .map((v) => ({ ...v, revenue: round2(v.revenue), discountedValue: round2(v.discountedValue) })),
      }));

    // ─── Non-moving: active products with 0 sales ─────────────────────────────
    const soldProductIds = Array.from(movementMap.keys());

    // Build stock range filter for non-moving
    const nonMovingStockWhere: Record<string, unknown> = {};
    if (stockStatus === "in_stock")     nonMovingStockWhere.stock = { gt: LOW_STOCK_THRESHOLD };
    if (stockStatus === "low_stock")    nonMovingStockWhere.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
    if (stockStatus === "out_of_stock") nonMovingStockWhere.stock = { lte: 0 };

    const nonMovingRaw = await db.product.findMany({
      where: {
        id:       { notIn: soldProductIds.length > 0 ? soldProductIds : ["__none__"] },
        isActive: true,
        ...productSupplierWhere,
        ...nonMovingStockWhere,
      },
      select: {
        id:              true,
        name:            true,
        sku:             true,
        stock:           true,
        price:           true,
        lastSuppliedAt:  true,
        supplierId:      true,
        productVariants: true,
        discountId:      true,
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { stock: "desc" },
      take: limit,
    });

    // Apply discount filter to non-moving (discountId presence on product)
    const nonMovingFiltered = nonMovingRaw.filter((p) => {
      if (discountStatus === "discounted" && !p.discountId) return false;
      if (discountStatus === "regular"    &&  p.discountId) return false;
      return true;
    });

    const nonMoving = nonMovingFiltered.map((p) => ({
      productId:       p.id,
      name:            p.name,
      sku:             p.sku || "N/A",
      stock:           p.stock,
      price:           p.price,
      lastSuppliedAt:  p.lastSuppliedAt ? p.lastSuppliedAt.toISOString() : null,
      totalSold:       0,
      revenue:         0,
      discountedValue: 0,
      hasDiscount:     !!p.discountId,
      supplierName:    p.supplier?.name ?? null,
      supplierId:      p.supplierId     ?? null,
      variants:        extractStaticVariants(p.productVariants),
    }));

    return NextResponse.json({
      success: true,
      fastMoving,
      nonMoving,
      suppliers,
      appliedFilters: { supplierId: supplierFilter, discountStatus, stockStatus },
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });
  } catch (error: any) {
    console.error("[Reports Item Movement] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
