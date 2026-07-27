import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { issueGiftCards } from "@/lib/giftcard/issueGiftCards";
import { locales } from "@/i18n/config";

const ORDER_STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

const PAYMENT_STATUS_VALUES = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;

const FULFILLMENT_PIPELINE = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
] as const;

const patchSchema = z
  .object({
    orderStatus: z.enum(ORDER_STATUS_VALUES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
    trackingNumber: z.string().trim().min(1).max(120).optional().nullable(),
    internalNotes: z.string().trim().max(4000).optional().nullable(),
  })
  .refine((value) => value.orderStatus || value.paymentStatus || value.trackingNumber !== undefined || value.internalNotes !== undefined, {
    message: "At least one field must be provided",
    path: ["orderStatus"],
  });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        userId: true,
        subtotal: true,
        total: true,
        deliveryFee: true,
        orderStatus: true,
        paymentStatus: true,
        internalNotes: true,
        isGift: true,
        giftMessage: true,
        senderName: true,
        senderPhone: true,
        recipientName: true,
        recipientPhone: true,
        giftWrapName: true,
        giftWrapPrice: true,
        suppressInvoice: true,
        revealSender: true,
        shippingAddress: true,
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productImage: true,
            quantity: true,
            unitPrice: true,
            salePrice: true,
            subtotal: true,
            discountName: true,
            discountValue: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            note: true,
            changedByUserId: true,
            changedByName: true,
            createdAt: true,
            changedByUser: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid payload",
        },
        { status: 400 }
      );
    }

    const existing = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderStatus: true,
        paymentStatus: true,
        trackingNumber: true,
        internalNotes: true,
        statusHistory: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const updateData: {
      orderStatus?: (typeof ORDER_STATUS_VALUES)[number];
      paymentStatus?: (typeof PAYMENT_STATUS_VALUES)[number];
      trackingNumber?: string | null;
      internalNotes?: string | null;
    } = {};

    if (parsed.data.orderStatus && parsed.data.orderStatus !== existing.orderStatus) {
      updateData.orderStatus = parsed.data.orderStatus;
    }

    if (parsed.data.paymentStatus && parsed.data.paymentStatus !== existing.paymentStatus) {
      updateData.paymentStatus = parsed.data.paymentStatus;
    }

    if (parsed.data.trackingNumber !== undefined) {
      const normalizedTrackingNumber = parsed.data.trackingNumber?.trim() || null;

      if (parsed.data.orderStatus === "SHIPPED" || existing.orderStatus === "SHIPPED") {
        if (normalizedTrackingNumber !== existing.trackingNumber) {
          updateData.trackingNumber = normalizedTrackingNumber;
        }
      }
    }

    if (parsed.data.orderStatus === "SHIPPED" && !updateData.trackingNumber && !existing.trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Courier tracking number is required when marking an order as SHIPPED.",
        },
        { status: 400 }
      );
    }

    if (parsed.data.internalNotes !== undefined && parsed.data.internalNotes !== existing.internalNotes) {
      updateData.internalNotes = parsed.data.internalNotes || null;
    }

    if (!updateData.orderStatus && !updateData.paymentStatus && updateData.internalNotes === undefined) {
      return NextResponse.json({ success: true, message: "No status changes detected" });
    }

    const missingHistoryRecords: Array<{
      status: (typeof ORDER_STATUS_VALUES)[number];
      note: string;
      changedByUserId: string;
      changedByName: string;
    }> = [];

    if (updateData.orderStatus) {
      const existingStatuses = new Set(existing.statusHistory.map((entry) => entry.status));
      const targetIndex = FULFILLMENT_PIPELINE.indexOf(updateData.orderStatus as (typeof FULFILLMENT_PIPELINE)[number]);

      if (targetIndex >= 0) {
        for (let i = 0; i <= targetIndex; i += 1) {
          const step = FULFILLMENT_PIPELINE[i];
          if (!existingStatuses.has(step)) {
            missingHistoryRecords.push({
              status: step,
              note: step === "PENDING" ? "Order placed successfully" : `Order marked as ${step}`,
              changedByUserId: session.user.id,
              changedByName: session.user.name || session.user.email || "Admin",
            });
            existingStatuses.add(step);
          }
        }
      } else if (!existingStatuses.has(updateData.orderStatus)) {
        missingHistoryRecords.push({
          status: updateData.orderStatus,
          note: `Order marked as ${updateData.orderStatus}`,
          changedByUserId: session.user.id,
          changedByName: session.user.name || session.user.email || "Admin",
        });
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        ...updateData,
        ...(missingHistoryRecords.length > 0
          ? {
              statusHistory: {
                create: missingHistoryRecords,
              },
            }
          : {}),
      },
      select: {
        id: true,
        orderStatus: true,
        paymentStatus: true,
        trackingNumber: true,
        updatedAt: true,
      },
    });

    if (updatedOrder.paymentStatus === "PAID" && existing.paymentStatus !== "PAID") {
      // Background task to issue gift cards
      issueGiftCards(id).catch(err => console.error("Gift card issuance failed:", err));
    }

    // Revalidate admin order pages (admin is at root, not under [locale])
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath(`/admin/orders`);
    // Revalidate customer order detail pages (still under [locale])
    for (const locale of locales) {
      revalidatePath(`/${locale}/profile/orders/${id}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}
