import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const session = await getServerSession(authOptions);

    // 1. Session Authentication Safeguard
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Please sign in to update order status." },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    const isClientUser = !ALLOWED_ROLES.includes(userRole);

    // 2. Request Body Validation Check
    const body = await request.json();
    const { orderStatus } = body;

    if (!orderStatus || orderStatus !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "Invalid payload. Only mutating status to 'DELIVERED' is permitted via this customer endpoint." },
        { status: 400 }
      );
    }

    // 3. Database Fetch & Owner/State Verification
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        orderStatus: true,
        paymentMethod: true,
        paymentStatus: true,
        statusHistory: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    // A standard customer can only update their own orders
    if (isClientUser && order.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not authorized to manage this order." },
        { status: 403 }
      );
    }

    const paymentMethod = order.paymentMethod?.toUpperCase() || "COD";
    const paymentStatus = order.paymentStatus?.toUpperCase() || "PENDING";

    // 4. BACKEND BUSINESS LOGIC SAFEGUARD FOR ACTIVE COD ORDERS
    if (isClientUser && paymentMethod === "COD" && paymentStatus === "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Customers cannot manually mark Cash on Delivery (COD) orders as received. Delivery and payment updates must be processed exclusively by the courier or administrator.",
        },
        { status: 403 }
      );
    }

    // If already delivered, no need to update
    if (order.orderStatus === "DELIVERED") {
      return NextResponse.json({
        success: true,
        message: "Order is already marked as delivered.",
        data: order,
      });
    }

    // 5. Update Order Status and History in Database
    const existingStatuses = new Set(order.statusHistory.map((entry) => entry.status));
    const historyRecords = [];

    // Auto-populate fulfillment pipeline milestones if missing
    const FULFILLMENT_PIPELINE = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];
    const targetIndex = FULFILLMENT_PIPELINE.indexOf("DELIVERED");

    for (let i = 0; i <= targetIndex; i++) {
      const step = FULFILLMENT_PIPELINE[i];
      if (!existingStatuses.has(step)) {
        historyRecords.push({
          status: step,
          note: step === "DELIVERED" 
            ? `Order marked as DELIVERED by customer (${session.user.name || session.user.email})` 
            : `Order milestone auto-marked as ${step}`,
          changedByUserId: session.user.id,
          changedByName: session.user.name || session.user.email || "Customer",
        });
      }
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "DELIVERED",
        paymentStatus: paymentMethod === "COD" ? "PAID" : paymentStatus, // Mark as paid for COD if completed
        statusHistory: {
          create: historyRecords,
        },
      },
      select: {
        id: true,
        orderStatus: true,
        paymentStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order successfully marked as received.",
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_STATUS_PUT_ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error encountered while updating order status." },
      { status: 500 }
    );
  }
}
