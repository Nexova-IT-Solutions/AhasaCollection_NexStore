// ─── Product Variant Type Definitions ─────────────────────────────────────────
// Represents the JSONB `productVariants` array stored in the Product model.

/**
 * A single variant entry as stored in the `productVariants` JSONB column.
 * Example: { "variantId": "v1", "size": "M", "color": "Red", "stock": 5, "sku": "SKU-M-RED" }
 */
export interface ProductVariantData {
  variantId: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
  price?: number;
  image?: string;
}

/**
 * The product shape expected by the VariantSelectorModal.
 * Intentionally minimal — callers map their domain product into this.
 */
export interface VariantProductPayload {
  id: string;
  name: string;
  nameAr?: string | null;
  price: number;
  salePrice?: number | null;
  stock: number;
  sizes: string[];
  colors: string[];
  productVariants: ProductVariantData[];
  image?: string | null;
  discountName?: string | null;
  discountValue?: number | null;
  discountType?: string | null;
}

/**
 * Result emitted by the modal when the user confirms a variant selection.
 */
export interface VariantSelection {
  variantId: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price?: number;
}

/**
 * Safely parse a raw JSONB value (from Prisma) into typed ProductVariantData[].
 * Returns an empty array for any malformed input.
 */
export function parseProductVariants(raw: unknown): ProductVariantData[] {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(data)) return [];

  const mapped = data
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const v = item as Record<string, unknown>;

      const size = typeof v.size === "string" ? v.size : "";
      const color = typeof v.color === "string" ? v.color : "";
      const stock = typeof v.stock === "number" ? v.stock : 0;
      const sku = typeof v.sku === "string" ? v.sku : "";
      const price = typeof v.price === "number" ? v.price : undefined;
      const image = typeof v.image === "string" ? v.image : undefined;

      // Generate a stable variantId if missing
      const variantId =
        typeof v.variantId === "string" && v.variantId
          ? v.variantId
          : `v-${size || "default"}-${color || "default"}-${index}`;

      const result: ProductVariantData = { variantId, size, color, stock, sku };
      if (price !== undefined) result.price = price;
      if (image !== undefined) result.image = image;
      return result;
    });

  return mapped.filter((item): item is ProductVariantData => item !== null);
}
