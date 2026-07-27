import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProductVariants } from "@/types/variant";

/**
 * POST /api/cart/validate-variant
 *
 * Performs an atomic server-side stock check for a specific product variant
 * before it is added to the cart. This prevents race conditions where the
 * client-side JSONB snapshot is stale.
 *
 * Body: { productId: string, variantId: string }
 * Returns:
 *   200 — { valid: true, stock: number }
 *   400 — { valid: false, message: string }
 *   404 — product or variant not found
 *   500 — internal error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, variantId } = body as {
      productId?: string;
      variantId?: string;
    };

    // ── Input Validation ──────────────────────────────────────
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { valid: false, message: "Missing or invalid productId." },
        { status: 400 }
      );
    }

    if (!variantId || typeof variantId !== "string") {
      return NextResponse.json(
        { valid: false, message: "Missing or invalid variantId." },
        { status: 400 }
      );
    }

    // ── Fetch Product ─────────────────────────────────────────
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        isActive: true,
        productVariants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { valid: false, message: "Product not found." },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { valid: false, message: "This product is no longer available." },
        { status: 400 }
      );
    }

    // ── Parse Variants JSONB ──────────────────────────────────
    const variants = parseProductVariants(product.productVariants);

    if (variants.length === 0) {
      return NextResponse.json(
        { valid: false, message: "This product has no configured variants." },
        { status: 400 }
      );
    }

    // ── Find Matching Variant ─────────────────────────────────
    const variant = variants.find((v) => v.variantId === variantId);

    if (!variant) {
      return NextResponse.json(
        { valid: false, message: "Variant not found for this product." },
        { status: 404 }
      );
    }

    // ── Stock Check ───────────────────────────────────────────
    if (variant.stock <= 0) {
      return NextResponse.json(
        {
          valid: false,
          message: `"${variant.size}${variant.color ? ` / ${variant.color.split('|')[0]}` : ""}" is currently out of stock.`,
          stock: 0,
        },
        { status: 400 }
      );
    }

    // ── Success ───────────────────────────────────────────────
    return NextResponse.json({
      valid: true,
      stock: variant.stock,
      variantId: variant.variantId,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
    });
  } catch (error) {
    console.error("[validate-variant] Error:", error);
    return NextResponse.json(
      { valid: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
