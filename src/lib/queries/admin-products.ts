import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const getAvailableGiftItemsForAdmin = unstable_cache(
  async () => {
    return db.product.findMany({
      where: {
        isActive: true,
        isPremiumGiftBox: false,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },
  ["admin-available-gift-items"],
  { revalidate: 60, tags: ["products"] }
);
