import { db } from "./db";

/**
 * Recalculates the average rating and review count for a product
 * and updates the Product record in the database.
 * Only APPROVED reviews are counted.
 */
export async function recalculateProductRating(productId: string, tx?: any) {
  const prisma = tx || db;

  const aggregates = await prisma.review.aggregate({
    where: {
      productId,
      status: "APPROVED",
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const averageRating = aggregates._avg.rating || 0;
  const reviewCount = aggregates._count.rating || 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating,
      reviewCount,
    },
  });

  return { averageRating, reviewCount };
}

/**
 * If the product is a Gift Box, propagate the rating update to all its child products.
 * Note: We don't create child review records, just update their averageRating/reviewCount
 * based on all reviews (direct and linked).
 * 
 * Wait, the prompt says: "automatically apply the same rating to all child products in GiftBoxItem 
 * as a 'linked review' (do not create duplicate Review records — just update averageRating on those products)."
 * 
 * This means we should include reviews from parent gift boxes when calculating a child product's rating.
 */
export async function syncGiftBoxRatings(productId: string, tx?: any) {
  const prisma = tx || db;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { isPremiumGiftBox: true },
  });

  if (!product?.isPremiumGiftBox) return;

  const items = await prisma.giftBoxItem.findMany({
    where: { boxId: productId },
    select: { itemId: true },
  });

  for (const item of items) {
    await recalculateProductRatingWithLinked(item.itemId, prisma);
  }
}

/**
 * Recalculates rating including reviews from parent gift boxes.
 */
export async function recalculateProductRatingWithLinked(productId: string, tx?: any) {
  const prisma = tx || db;

  // Get direct approved reviews
  const directReviews = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });

  // Get reviews from parent gift boxes
  const parentBoxes = await prisma.giftBoxItem.findMany({
    where: { itemId: productId },
    select: { boxId: true },
  });

  const parentBoxIds = parentBoxes.map((pb: any) => pb.boxId);
  
  const linkedReviews = await prisma.review.findMany({
    where: { 
      productId: { in: parentBoxIds }, 
      status: "APPROVED" 
    },
    select: { rating: true },
  });

  const allRatings = [...directReviews, ...linkedReviews].map(r => r.rating);
  
  const reviewCount = allRatings.length;
  const averageRating = reviewCount > 0 
    ? allRatings.reduce((sum, r) => sum + r, 0) / reviewCount 
    : 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating,
      reviewCount,
    },
  });

  return { averageRating, reviewCount };
}
