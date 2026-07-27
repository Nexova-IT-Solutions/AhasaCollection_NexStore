import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RecentlyViewedRow = {
  id: string;
  name: string;
  price: number;
  image: string;
};

type RecentlyViewedDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy: { viewedAt: "desc" };
    take: number;
    select: {
      product: {
        select: {
          id: true;
          name: true;
          price: true;
          productImages: true;
        };
      };
    };
  }) => Promise<Array<{ product: { id: string; name: string; price: number; productImages: unknown } }>>;
};

function extractProductImage(productImages: unknown): string {
  if (Array.isArray(productImages) && productImages.length > 0) {
    const firstImage = productImages[0] as { url?: string } | undefined;
    if (firstImage && typeof firstImage.url === "string" && firstImage.url.length > 0) {
      return firstImage.url;
    }
  }

  return "/logo/logo.png";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const recentlyViewedDelegate = (db as unknown as { recentlyViewed?: RecentlyViewedDelegate }).recentlyViewed;

    if (!recentlyViewedDelegate) {
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const rows = await recentlyViewedDelegate.findMany({
      where: { userId: session.user.id },
      orderBy: { viewedAt: "desc" },
      take: 10,
      select: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            productImages: true,
          },
        },
      },
    });

    const response: RecentlyViewedRow[] = rows.map((row) => ({
      id: row.product.id,
      name: row.product.name,
      price: row.product.price,
      image: extractProductImage(row.product.productImages),
    }));

    return NextResponse.json(response, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
