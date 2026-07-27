import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  orderId: z.string().min(1, "Order ID is required"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500, "Comment cannot exceed 500 characters").optional().nullable(),
  images: z.array(z.string()).max(3, "Maximum 3 images allowed").optional().default([]),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const { productId, orderId, rating, comment, images } = parsed.data;

    console.log('Review submission body:', { productId, orderId, rating });
    console.log('orderId received:', orderId);

    // Check if this specific order exists, is delivered, and contains the product
    const deliveredOrder = await db.order.findFirst({
      where: {
        id: orderId,
        userId,
        orderStatus: "DELIVERED",
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!deliveredOrder) {
      return NextResponse.json(
        { message: "You can only review products you have purchased and received in this order." },
        { status: 403 }
      );
    }

    // Build the duplicate check where clause carefully
    const duplicateWhere: any = {
      userId,
      productId,
      status: { not: "REJECTED" },
      ...(orderId ? { orderId } : { orderId: null }),
    };

    const existingReview = await db.review.findFirst({
      where: duplicateWhere,
    });

    if (existingReview) {
      return NextResponse.json(
        { message: "You have already reviewed this product for this order." },
        { status: 409 }
      );
    }

    try {
      const review = await db.review.create({
        data: {
          userId,
          productId,
          orderId: orderId || null,
          rating,
          comment: comment || null,
          images,
          status: "PENDING",
        },
      });

      return NextResponse.json({ success: true, review: { id: review.id, status: "PENDING" } });
    } catch (err: any) {
      // Handle race condition duplicate submission (Prisma P2002)
      if (err.code === "P2002") {
        return NextResponse.json(
          { message: "You have already reviewed this product for this order." },
          { status: 409 }
        );
      }
      console.error("Review creation error:", err);
      return NextResponse.json(
        { message: "Failed to submit review. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
