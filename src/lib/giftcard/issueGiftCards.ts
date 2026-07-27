import { db } from "@/lib/db";
import { customAlphabet } from "nanoid";
import { sendGiftCardEmail } from "@/lib/email/sendGiftCardEmail";

// Using a custom alphabet for cleaner voucher codes (removed ambiguous characters like 0/O, 1/I/L)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 4);

/**
 * Checks an order for e-gift card products and issues them.
 * Triggers email delivery to recipients.
 */
export async function issueGiftCards(orderId: string) {
  console.log(`[issueGiftCards] Starting issuance process for order ${orderId}`);
  
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      console.error(`[issueGiftCards] Order ${orderId} not found`);
      return;
    }

    // 1. Get all existing digital cards for this order to ensure idempotency
    const existingCards = await db.giftCard.findMany({
      where: {
        OR: [
          { orderId: order.id },
          { purchasedInOrderId: order.id }
        ],
        type: "DIGITAL"
      }
    });

    // Track how many cards we've already accounted for by value
    const cardsByValue = new Map<number, number>();
    existingCards.forEach(card => {
      const val = card.initialValue;
      cardsByValue.set(val, (cardsByValue.get(val) || 0) + 1);
    });

    // 2. Identify and create missing cards
    const productIds = order.items.map(item => item.productId);
    const egiftProducts = await db.product.findMany({
      where: {
        id: { in: productIds },
        isEGiftCard: true,
      }
    });

    const egiftProductsMap = new Map(egiftProducts.map(p => [p.id, p]));

    for (const item of order.items) {
      const product = egiftProductsMap.get(item.productId);
      const isVirtualGC = item.productId === "digital-gift-card";
      
      if (!product && !isVirtualGC) continue;

      const gcValue = isVirtualGC ? item.unitPrice : (product?.giftCardValue || item.unitPrice);
      
      const alreadyCreatedCount = cardsByValue.get(gcValue) || 0;
      const totalRequiredForThisItem = item.quantity;
      
      const toCreateCount = Math.max(0, totalRequiredForThisItem - alreadyCreatedCount);
      
      // Update the pool for next iteration (in case multiple line items have same value)
      cardsByValue.set(gcValue, Math.max(0, alreadyCreatedCount - totalRequiredForThisItem));

      if (toCreateCount <= 0) continue;

      console.log(`[issueGiftCards] Creating ${toCreateCount} missing gift cards for value LKR ${gcValue}`);

      // Bank Transfer cards start as INACTIVE
      const shouldBeActive = order.paymentMethod !== "BANK_TRANSFER";

      for (let i = 0; i < toCreateCount; i++) {
        const code = `GBL-${nanoid()}-${nanoid()}-${nanoid()}`;

        await db.giftCard.create({
          data: {
            code,
            initialValue: gcValue,
            balance: gcValue,
            currency: "LKR",
            isActive: shouldBeActive,
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            orderId: order.id,
            purchasedByUserId: order.userId,
            recipientEmail: order.recipientEmail || order.customerEmail,
            recipientName: order.recipientName || order.customerName,
            senderName: order.senderName || order.customerName,
            personalMessage: order.giftMessage,
            deliveryStatus: "PENDING",
            type: "DIGITAL",
            status: "AVAILABLE",
          }
        });
      }
    }

    console.log(`[issueGiftCards] Querying for PENDING & ACTIVE cards for order ${order.id}`);
    const pendingGiftCards = await db.giftCard.findMany({
      where: {
        OR: [
          { orderId: order.id },
          { purchasedInOrderId: order.id }
        ],
        deliveryStatus: "PENDING",
        type: "DIGITAL",
        isActive: true, 
      }
    });

    console.log(`[issueGiftCards] Found ${pendingGiftCards.length} cards ready for delivery`);

    if (pendingGiftCards.length === 0) {
      console.log(`[issueGiftCards] No active pending cards found. Checking if they were already sent...`);
      const sentCount = await db.giftCard.count({
        where: {
          OR: [{ orderId: order.id }, { purchasedInOrderId: order.id }],
          deliveryStatus: "SENT"
        }
      });
      console.log(`[issueGiftCards] Found ${sentCount} cards already marked as SENT`);
      return;
    }

    for (const giftCard of pendingGiftCards) {
      try {
        const deliveryInfo = {
          ...giftCard,
          recipientEmail: giftCard.recipientEmail || order.recipientEmail || order.customerEmail,
          recipientName: giftCard.recipientName || order.recipientName || order.customerName,
          senderName: giftCard.senderName || order.senderName || order.customerName,
          personalMessage: giftCard.personalMessage || order.giftMessage,
        };

        if (!deliveryInfo.recipientEmail) continue;

        await sendGiftCardEmail(deliveryInfo);
        
        await db.giftCard.update({
          where: { id: giftCard.id },
          data: {
            deliveryStatus: "SENT",
            sentAt: new Date(),
          }
        });
      } catch (emailError) {
        console.error(`[issueGiftCards] Failed to deliver gift card ${giftCard.code}:`, emailError);
        await db.giftCard.update({
          where: { id: giftCard.id },
          data: { deliveryStatus: "FAILED" }
        });
      }
    }
  } catch (error) {
    console.error("[issueGiftCards] Fatal error:", error);
  }
}
