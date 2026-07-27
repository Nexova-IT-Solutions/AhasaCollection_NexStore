import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reason, images } = body;

    if (!reason || reason.length < 10) {
      return NextResponse.json(
        { message: "Reason must be at least 10 characters long" },
        { status: 400 }
      );
    }

    // Verify order exists, belongs to user, and is DELIVERED
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.orderStatus !== "DELIVERED") {
      return NextResponse.json(
        { message: "Only delivered orders can be returned" },
        { status: 400 }
      );
    }

    // Check if return request already exists
    const existingRequest = await db.returnRequest.findUnique({
      where: {
        orderId,
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { message: "A return request already exists for this order" },
        { status: 400 }
      );
    }

    // Create the return request
    const returnRequest = await db.returnRequest.create({
      data: {
        orderId,
        userId: session.user.id,
        reason,
        images: images || [],
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { message: "Return request submitted successfully", returnRequest },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[RETURN_REQUEST_POST]", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
