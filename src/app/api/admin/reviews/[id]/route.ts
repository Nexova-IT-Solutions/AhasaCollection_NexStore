import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewStatus } from "@prisma/client";
import { recalculateProductRating } from "@/lib/review-utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || !["SUPER_ADMIN", "DEV_ADMIN", "PRODUCT_MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { status } = await req.json();

    if (!status || !Object.values(ReviewStatus).includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const review = await db.review.findUnique({
      where: { id },
      select: { productId: true, status: true },
    });

    if (!review) {
      return NextResponse.json({ message: "Review not found" }, { status: 404 });
    }

    // Update the review
    const updatedReview = await db.review.update({
      where: { id },
      data: {
        status: status as ReviewStatus,
        approvedAt: status === "APPROVED" ? new Date() : null,
        approvedBy: status === "APPROVED" ? session.user.id : null,
      },
    });

    // If status changed to/from APPROVED, recalculate product rating
    if (review.status === "APPROVED" || status === "APPROVED") {
      await recalculateProductRating(review.productId);
    }

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error) {
    console.error("Admin review update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
