import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shuffleArray } from "@/lib/utils";

export const revalidate = 0;

export async function GET() {
  try {
    const allProducts = await db.product.findMany({
      where: {
        isActive: true,
        isPremiumGiftBox: true,
        stock: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        productImages: true,
        isPremiumGiftBox: true,
        discount: {
          select: {
            id: true,
            name: true,
            value: true,
            type: true,
            isActive: true,
            startsAt: true,
            endsAt: true,
          }
        },
        itemsInside: {
          select: {
            quantity: true,
            item: {
              select: {
                stock: true
              }
            }
          }
        }
      },
    });

    // Image guard logic
    const filteredProducts = allProducts.filter((product) => {
      const images = product.productImages as any;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return false;
      }
      const firstImage = images[0];
      const src = firstImage?.url || firstImage?.src;
      return !!src;
    });

    const shuffled = shuffleArray(filteredProducts);
    const result = shuffled.slice(0, 5);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching gift boxes:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
