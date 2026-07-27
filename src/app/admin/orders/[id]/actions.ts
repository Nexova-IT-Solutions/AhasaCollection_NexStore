"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { issueGiftCards } from "@/lib/giftcard/issueGiftCards";
import { locales } from "@/i18n/config";

const FULFILLMENT_PIPELINE = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
] as const;

const cleanKey = (str: string) => String(str).replace(/[\s_\-]+/g, "").toUpperCase();

export async function updateOrderAction(
  orderId: string,
  data: {
    orderStatus?: string;
    paymentStatus?: string;
    trackingNumber?: string;
    internalNotes?: string;
  }
) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  try {
    const existing = await db.order.findUnique({
      where: { id: orderId },
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
      throw new Error("Order not found");
    }

    const updateData: any = {};
    const historyRecords: any[] = [];

    const normalizedTrackingNumber = data.trackingNumber?.trim();

    // Handle Order Status Update
    if (data.orderStatus && data.orderStatus !== existing.orderStatus) {
      updateData.orderStatus = data.orderStatus;

      const existingStatuses = new Set(
        existing.statusHistory.map((entry) => cleanKey(String(entry.status)))
      );
      const targetIndex = FULFILLMENT_PIPELINE.indexOf(data.orderStatus as any);

      if (targetIndex >= 0) {
        // Fill in missing pipeline steps
        for (let i = 0; i <= targetIndex; i += 1) {
          const step = FULFILLMENT_PIPELINE[i];
          if (!existingStatuses.has(cleanKey(step))) {
            historyRecords.push({
              status: step,
              note: step === "PENDING" ? "Order placed successfully" : `Order marked as ${step.replace("_", " ")}`,
              changedByUserId: session.user.id,
              changedByName: session.user.name || session.user.email || "Admin",
            });
          }
        }
      } else {
        // For non-pipeline statuses like CANCELLED or REFUNDED
        historyRecords.push({
          status: data.orderStatus,
          note: `Order marked as ${data.orderStatus.replace("_", " ")}`,
          changedByUserId: session.user.id,
          changedByName: session.user.name || session.user.email || "Admin",
        });
      }
    }

    if (data.orderStatus === "SHIPPED") {
      if (!normalizedTrackingNumber) {
        return { success: false, message: "Courier tracking number is required when marking an order as SHIPPED." };
      }

      if (normalizedTrackingNumber !== existing.trackingNumber) {
        updateData.trackingNumber = normalizedTrackingNumber;
      }
    } else if (data.trackingNumber !== undefined && normalizedTrackingNumber !== existing.trackingNumber) {
      updateData.trackingNumber = normalizedTrackingNumber || null;
    }

    // Handle Payment Status Update
    if (data.paymentStatus && data.paymentStatus !== existing.paymentStatus) {
      updateData.paymentStatus = data.paymentStatus;
      // Optional: Add history for payment changes if schema supports it or just note it in a general history
      historyRecords.push({
        status: existing.orderStatus, // Keep current order status in history
        note: `Payment status updated to ${data.paymentStatus}`,
        changedByUserId: session.user.id,
        changedByName: session.user.name || session.user.email || "Admin",
      });
    }

    // Handle Internal Notes
    if (data.internalNotes !== undefined && data.internalNotes !== existing.internalNotes) {
      updateData.internalNotes = data.internalNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: "No changes detected" };
    }

    // Perform update and apply historyRecords with dedup behavior inside a transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      // 1) Apply core order updates
      await tx.order.update({ where: { id: orderId }, data: updateData });

      // 2) Process historyRecords one by one to avoid duplicate consecutive statuses
      if (historyRecords.length > 0) {
        // fetch the latest history entry for this order
        let last = await tx.orderStatusHistory.findFirst({
          where: { orderId },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        });

        for (const record of historyRecords) {
          const lastStatusNormalized = last ? cleanKey(String(last.status)) : null;
          const recordStatusNormalized = cleanKey(String(record.status));

          if (last && lastStatusNormalized === recordStatusNormalized) {
            // If last status equals incoming status, update its timestamp and note instead of creating duplicate
            await tx.orderStatusHistory.update({
              where: { id: last.id },
              data: {
                createdAt: new Date(),
                note: record.note,
                changedByUserId: record.changedByUserId,
                changedByName: record.changedByName,
              },
            });
          } else {
            // create a new history record
            await tx.orderStatusHistory.create({
              data: {
                orderId,
                status: record.status,
                note: record.note,
                changedByUserId: record.changedByUserId,
                changedByName: record.changedByName,
              },
            });
          }

          // refresh last to the most recent entry
          last = await tx.orderStatusHistory.findFirst({
            where: { orderId },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true },
          });
        }
      }

      // 3) Return the freshly updated order with statusHistory for downstream logic
      return tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderStatus: true,
          paymentStatus: true,
          trackingNumber: true,
          internalNotes: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              note: true,
              changedByUserId: true,
              changedByName: true,
              createdAt: true,
              changedByUser: { select: { email: true } },
            },
          },
        },
      });
    });

    // Handle gift card issuance if payment becomes PAID
    if (updatedOrder.paymentStatus === "PAID" && existing.paymentStatus !== "PAID") {
      issueGiftCards(orderId).catch((err) => console.error("Gift card issuance failed:", err));
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    for (const locale of locales) {
      revalidatePath(`/${locale}/profile/orders/${orderId}`);
    }

    return { success: true, data: updatedOrder };
  } catch (error: any) {
    console.error("Order update error:", error);
    return { success: false, message: error.message || "Failed to update order" };
  }
}

export async function approveAndSendGiftCards(orderId: string) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentMethod: true,
      }
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      console.log(`[approveAndSendGiftCards] Manual trigger for ${order.paymentMethod} order ${orderId}`);
    }

    // 1. Activate all related digital gift cards first
    const activatedCount = await db.$transaction(async (tx) => {
      return await tx.giftCard.updateMany({
        where: {
          OR: [
            { orderId: orderId },
            { purchasedInOrderId: orderId }
          ],
          type: "DIGITAL",
          isActive: false,
        },
        data: {
          isActive: true,
        }
      });
    });

    console.log(`[approveAndSendGiftCards] Activated ${activatedCount.count} gift cards for order ${orderId}`);

    // 2. Call issueGiftCards to handle issuance/creation and sending
    await issueGiftCards(orderId);

    // 3. Force revalidation
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
    
    return { success: true, message: `Payment approved. ${activatedCount.count} gift cards activated and processed.` };
  } catch (error: any) {
    console.error("Manual gift card issuance error:", error);
    return { success: false, message: error.message || "Failed to issue gift cards" };
  }
}
