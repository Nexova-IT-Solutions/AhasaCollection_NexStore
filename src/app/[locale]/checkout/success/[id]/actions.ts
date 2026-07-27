"use server";

import { db } from "@/lib/db";
import { issueGiftCards } from "@/lib/giftcard/issueGiftCards";
import { revalidatePath } from "next/cache";

export async function resendGiftCardEmailsAction(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        purchasedGiftCards: true,
        giftCardsIssued: true,
      }
    });

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Reset failed/pending statuses so they are picked up again
    await db.giftCard.updateMany({
      where: {
        OR: [
          { orderId: orderId },
          { purchasedInOrderId: orderId }
        ],
        type: "DIGITAL"
      },
      data: {
        deliveryStatus: "PENDING"
      }
    });

    // Trigger issuance process
    await issueGiftCards(orderId);

    revalidatePath(`/checkout/success/${orderId}`);
    revalidatePath(`/profile/orders`);

    return { success: true };
  } catch (error: any) {
    console.error("[resendGiftCardEmailsAction] Error:", error);
    return { success: false, message: error.message || "Failed to resend emails" };
  }
}
