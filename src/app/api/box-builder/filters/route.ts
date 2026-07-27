import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVisibleCategories } from "@/lib/categories";
import { getStoreConfig } from "@/lib/store-config";

export async function GET() {
  try {
    const config = await getStoreConfig();
    const hideEmpty = config.hideEmptyCategories;

    // Fetch categories that have builder products using the shared utility
    const rootCategories = await getVisibleCategories({
      hideEmpty,
      includeChildren: true,
      isForBuilder: true,
    });

    const categoriesList = rootCategories.map((cat) => ({
      id: cat.slug,
      name: cat.name,
      subCategories: cat.subCategories ? cat.subCategories.map((sub) => ({
        id: sub.slug,
        name: sub.name,
      })) : [],
    }));

    // Fetch occasions that have builder products
    const occasions = await db.occasion.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isAvailableInBuilder: true,
            isActive: true,
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
      }
    });

    // Fetch recipients that have builder products
    const recipients = await db.recipient.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isAvailableInBuilder: true,
            isActive: true,
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
      }
    });

    // Get price range
    const priceStats = await db.product.aggregate({
      where: {
        isAvailableInBuilder: true,
        isActive: true,
      },
      _max: {
        price: true,
      },
      _min: {
        price: true,
      }
    });

    return NextResponse.json({
      categories: categoriesList,
      occasions: occasions.map(o => ({
        id: o.slug,
        name: o.name,
      })),
      recipients: recipients.map(r => ({
        id: r.slug,
        name: r.name,
      })),
      priceRange: {
        min: priceStats._min.price || 0,
        max: priceStats._max.price || 10000,
      }
    });
  } catch (error) {
    console.error("[BOX_BUILDER_FILTERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
