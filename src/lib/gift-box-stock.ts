import { db } from "@/lib/db";

/**
 * Returns true if the gift box is effectively out of stock
 * based on its child items' current stock levels.
 */
export function isGiftBoxEffectivelyOutOfStock(
  itemsInside: Array<{ quantity: number; item: { stock: number } }>
): boolean {
  if (!itemsInside || itemsInside.length === 0) return false;
  return itemsInside.some((boxItem) => boxItem.item.stock < boxItem.quantity);
}

/**
 * After any stock change on a child item, recalculate and persist
 * the effective stock of all parent Gift Boxes containing that item.
 * Call this inside admin stock update routes.
 */
export async function syncParentBoxStock(itemId: string): Promise<void> {
  const parentBoxItems = await db.giftBoxItem.findMany({
    where: { itemId },
    select: { boxId: true },
  });

  const uniqueBoxIds = Array.from(new Set(parentBoxItems.map((r) => r.boxId)));

  for (const boxId of uniqueBoxIds) {
    const childItems = await db.giftBoxItem.findMany({
      where: { boxId },
      select: {
        quantity: true,
        item: { select: { stock: true } },
      },
    });

    if (childItems.length === 0) {
      await db.product.update({
        where: { id: boxId },
        data: { stock: 0 },
      });
      continue;
    }

    // Effective stock = minimum number of complete boxes possible
    const effectiveStock = childItems.reduce((min, ci) => {
      const possible = Math.floor(ci.item.stock / ci.quantity);
      return Math.min(min, possible);
    }, Infinity);

    await db.product.update({
      where: { id: boxId },
      data: { stock: effectiveStock === Infinity ? 0 : effectiveStock },
    });
  }
}
