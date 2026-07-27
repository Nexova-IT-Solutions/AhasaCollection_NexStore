import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Placeholder for email notification function
async function sendReturnStatusEmail(email: string, status: string, adminNote?: string) {
  console.log(`[EMAIL_SIMULATION] Sending ${status} notification to ${email}. Note: ${adminNote || "None"}`);
  // In a real scenario, this would use nodemailer or a similar service
  return Promise.resolve();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: returnRequestId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, adminNote, shouldRestock } = body;

    if (!status) {
      return NextResponse.json({ message: "Status is required" }, { status: 400 });
    }

    // Fetch the return request with order and items
    const returnRequest = await db.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { 
        order: {
          include: {
            items: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ message: "Return request not found" }, { status: 404 });
    }

    // Process status update and potential restocking in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Update the return request
      const updated = await tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status,
          adminNote: adminNote || undefined,
        },
      });

      // 2. Handle Restocking if ACCEPTED and requested
      if (status === "ACCEPTED" && shouldRestock) {
        for (const item of returnRequest.order.items) {
          // Only restock physical products (skip digital ones if any)
          if (item.productId && item.productId !== "digital-gift-card" && !item.productId.startsWith("giftcard-")) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      // 3. Update Order status if REFUNDED
      if (status === "REFUNDED") {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: {
            orderStatus: "REFUNDED",
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: returnRequest.orderId,
            status: "REFUNDED",
            note: `Order refunded via return request management. Admin Note: ${adminNote || "None"}`,
            updatedBy: session.user.id,
          },
        });
      }

      return updated;
    });

    // 4. Send Email Notification (Background/Placeholder)
    // We wrap this in a try-catch to ensure the API request succeeds even if email fails
    if (returnRequest.order.user?.email) {
      sendReturnStatusEmail(
        returnRequest.order.user.email, 
        status, 
        adminNote
      ).catch(err => console.error("[EMAIL_ERROR]", err));
    }

    return NextResponse.json({ 
      message: "Return request updated successfully", 
      returnRequest: result 
    });
  } catch (error: any) {
    console.error("[RETURN_STATUS_PATCH]", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
