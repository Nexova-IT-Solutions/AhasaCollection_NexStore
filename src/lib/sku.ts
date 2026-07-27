/**
 * Generates a SKU from category slug + random suffix.
 * Format: {CAT}-{XXXXX}
 * Example: CHOC-A3F91, GIFT-B2K44
 *
 * Max 12 chars total — fits thermal printer label comfortably.
 */
export function generateSKU(categorySlug?: string | null): string {
  const prefix = categorySlug
    ? categorySlug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()
    : "ITEM";
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${suffix}`;
}
