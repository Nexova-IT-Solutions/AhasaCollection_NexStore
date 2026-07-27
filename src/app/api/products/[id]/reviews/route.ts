import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [reviews, totalCount, aggregate, productData] = await Promise.all([
      db.review.findMany({
        where: {
          productId,
          status: "APPROVED",
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.review.count({
        where: {
          productId,
          status: "APPROVED",
        },
      }),
      db.review.groupBy({
        by: ['rating'],
        where: {
          productId,
          status: "APPROVED",
        },
        _count: {
          rating: true,
        },
      }),
      db.product.findUnique({
        where: { id: productId },
        select: {
          averageRating: true,
          reviewCount: true,
        },
      }),
    ]);

    // Format aggregate data
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    aggregate.forEach((item) => {
      ratingBreakdown[item.rating] = item._count.rating;
    });

    // Sanitize user names (first name only)
    const sanitizedReviews = reviews.map((review) => {
      const firstName = review.user.name?.split(" ")[0] || "Anonymous";
      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        images: review.images,
        userName: firstName,
        createdAt: review.createdAt,
      };
    });

    return NextResponse.json({
      reviews: sanitizedReviews,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      aggregate: {
        averageRating: productData?.averageRating || 0,
        reviewCount: productData?.reviewCount || 0,
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
