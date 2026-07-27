import { db } from "@/lib/db";

/**
 * Decrements the stock of a product atomically at the database level.
 * Prevents race conditions (overselling) by ensuring stock does not drop below zero.
 * 
 * @param productId The ID of the product to update.
 * @param quantity The quantity to decrement by.
 * @returns A promise that resolves to true if the update was successful, or false if there was insufficient stock.
 */
export async function decrementStockAtomic(productId: string, quantity: number): Promise<boolean> {
  if (quantity <= 0) return false;
  
  try {
    const affectedRows = await db.$executeRaw`
      UPDATE "Product"
      SET stock = stock - ${quantity}
      WHERE id = ${productId} AND stock >= ${quantity}
    `;
    
    return affectedRows === 1;
  } catch (error) {
    console.error("[decrementStockAtomic] Error executing atomic stock update:", error);
    return false;
  }
}
