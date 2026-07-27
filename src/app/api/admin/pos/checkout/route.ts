import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { issueGiftCards } from "@/lib/giftcard/issueGiftCards";

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN", "STOREFRONT_ADMIN", "PRODUCT_MANAGER", "CUSTOM_ROLE"];

// ─── Zod Schema Definitions ──────────────────────────────────────────

const checkoutItemSchema = z.object({
  id: z.string().optional().nullable(),
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().optional().nullable(),
  productNameAr: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  salePrice: z.number().nullable().optional(),
  discountPercent: z.number().optional().nullable(),
  discountName: z.string().nullable().optional(),
  discountValue: z.number().nullable().optional(),
  isGiftCard: z.boolean().optional(),
  giftCardCode: z.string().optional().nullable(),
  isPhysical: z.boolean().optional(),
  recipientEmail: z.string().optional().nullable(),
  personalMessage: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  isCustomBox: z.boolean().optional(),
  customBoxConfig: z.any().optional(),
  parentBoxId: z.string().optional().nullable(),
});

const splitPaymentSchema = z.object({
  method: z.string(),
  amount: z.number().min(0),
  reference: z.string().nullable().optional(),
});

const posCheckoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "At least one item is required"),
  subtotal: z.number(),
  total: z.number().min(0, "Total must be non-negative"),
  paymentMethod: z.enum(["POS_CASH", "POS_CARD", "POS_GIFT_CARD", "POS_SPLIT", "CREDIT_CARD", "DEBIT_CARD", "POS_MOBILE_TRANSFER", "POS_CREDIT"]),
  cashTendered: z.number().optional().nullable(),
  changeDue: z.number().optional().nullable(),
  cardReference: z.string().optional().nullable(),
  giftCardCode: z.string().optional().nullable(),
  giftCardDeduction: z.number().optional().nullable(),
  splitPayments: z.array(splitPaymentSchema).optional().nullable(),
  shiftId: z.string().min(1, "Active shift ID is required"),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "USED", "DISABLED"]).optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  requestedDeliveryDate: z.string().datetime().nullable().optional(),
});

/**
 * POS Checkout — Atomic inventory deduction via Prisma interactive transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: POS access required" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // ─── Zod Body Validation ──────────────────────────────────────────
    const validation = posCheckoutSchema.safeParse(body);

    if (!validation.success) {
      console.error("Zod Validation Dump:", JSON.stringify(validation.error.format(), null, 2));
      const firstError = Object.values(validation.error.flatten().fieldErrors)?.[0]?.[0] || "Invalid input data";
      return NextResponse.json(
        { success: false, message: firstError, errors: validation.error.format() },
        { status: 400 }
      );
    }

    const payload = validation.data;

    // ─── Guard: Reject eGift Cards at POS ───────────────────────────────
    const hasEGiftCard = payload.items.some(item => item.isGiftCard && !item.isPhysical);
    if (hasEGiftCard) {
      return NextResponse.json(
        { success: false, message: "eGift Cards cannot be issued at the POS Terminal. Only Physical Paper Cards are allowed." },
        { status: 400 }
      );
    }

    // ─── Safe Property Fallback Check ─────────────────────────────────
    let finalStatus = payload.status;
    if (payload.isActive === true || body.isActive === true || body.isActive === "true") {
      finalStatus = "AVAILABLE";
    }

    const {
      items,
      subtotal,
      total,
      paymentMethod,
      cashTendered,
      changeDue,
      cardReference,
      giftCardCode,
      giftCardDeduction,
      splitPayments,
      shiftId,
      customerId,
      customerName,
      customerPhone,
      notes,
    } = payload;

    // ─── Extra Payment Method Validations ─────────────────────────────
    if (paymentMethod === "POS_CASH") {
      if (typeof cashTendered !== "number" || cashTendered < total) {
        return NextResponse.json(
          { success: false, message: "Cash tendered must be at least equal to the total" },
          { status: 400 }
        );
      }
    }

    if (paymentMethod === "POS_SPLIT") {
      if (!splitPayments || splitPayments.length === 0) {
        return NextResponse.json(
          { success: false, message: "Split payments must have at least one entry" },
          { status: 400 }
        );
      }

      const splitTotal = splitPayments.reduce((sum: number, sp) => sum + (sp.amount || 0), 0);
      if (Math.abs(splitTotal - total) > 0.001) {
        return NextResponse.json(
          {
            success: false,
            message: `Split payment total (${splitTotal.toFixed(3)}) does not match order total (${total.toFixed(3)})`,
          },
          { status: 400 }
        );
      }
    }

    if (paymentMethod === "POS_CREDIT") {
      if (!customerId) {
        return NextResponse.json(
          { success: false, message: "A registered customer must be selected to use Store Credit." },
          { status: 400 }
        );
      }
    }

    // ─── Verify Shift is Open ─────────────────────────────────────────
    const shift = await db.posShift.findFirst({
      where: { id: shiftId, status: "OPEN" },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, message: "No open shift found. Start a shift first." },
        { status: 400 }
      );
    }

    // ─── Atomic Transaction ───────────────────────────────────────────
    const result = await db.$transaction(async (tx) => {
      // Step 1: Verify stock and lock products by reading within transaction
      const stockErrors: string[] = [];
      const productDataMap: Map<string, any> = new Map();

      for (const item of items) {
        if (item.isGiftCard) {
          // Gift cards are virtual/digital items: skip DB lookup and stock checks
          continue;
        }

        const baseProductId = item.productId.split('-')[0];
        const variantIdSuffix = item.productId.substring(baseProductId.length + 1);

        const product = await tx.product.findUnique({
          where: { id: baseProductId },
          select: {
            id: true,
            name: true,
            nameAr: true,
            sku: true,
            stock: true,
            price: true,
            salePrice: true,
            isActive: true,
            productImages: true,
            productVariants: true,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Separate variant validation logic if requested
        // If variantIdSuffix exists OR we have explicit color/size
        if ((variantIdSuffix || item.color || item.size) && Array.isArray(product.productVariants)) {
          const variants = product.productVariants as any[];
          const variant = variants.find((v, idx) => {
            // Reconstruct the same fallback variantId generated client-side in parseProductVariants
            const size = typeof v.size === 'string' ? v.size : '';
            const color = typeof v.color === 'string' ? v.color : '';
            const generatedId = v.variantId || `v-${size || 'default'}-${color || 'default'}-${idx}`;

            // First try strict ID match if we have a suffix
            if (variantIdSuffix) {
              // Match against stored variantId, generated fallback id, or raw v.id
              if (generatedId === variantIdSuffix || v.id === variantIdSuffix) return true;
              // Match by productId containing the variantId
              if (v.variantId && item.productId.includes(v.variantId)) return true;
              if (v.id && item.productId.includes(v.id)) return true;
              // Match by SKU
              if (v.sku && (variantIdSuffix === v.sku || variantIdSuffix.includes(v.sku))) return true;
              // Match if suffix contains the color name
              if (v.color && variantIdSuffix.toLowerCase().includes(v.color.split('|')[0].toLowerCase().trim())) return true;
              // Match if suffix contains the size name
              if (v.size && variantIdSuffix.toLowerCase().includes(v.size.toLowerCase().trim())) return true;
            }
            
            // Fallback: match by color+size if explicitly provided
            const dbColor = v.color?.split('|')[0]?.toLowerCase().trim();
            const reqColor = item.color?.toLowerCase().trim();
            const dbSize = v.size?.toLowerCase().trim();
            const reqSize = item.size?.toLowerCase().trim();

            if (reqColor || reqSize) {
               return dbColor === reqColor && (dbSize === reqSize || (!dbSize && !reqSize));
            }
            return false;
          });
          
          if (!variant) {
            console.log("DEBUG: Matching failed.", { 
              reqColor: item.color, 
              reqSize: item.size, 
              variantIdSuffix,
              available: (product.productVariants as any[]).map((v: any, i: number) => ({
                stored: v.variantId,
                generated: v.variantId || `v-${v.size || 'default'}-${v.color || 'default'}-${i}`,
                size: v.size, color: v.color, sku: v.sku
              }))
            });
            throw new Error(`Variant not found for product: ${product.name}`);
          }
          
          if (variant.stock < item.quantity) {
             stockErrors.push(
               `${product.name} (Variant): Only ${variant.stock} in stock, requested ${item.quantity}`
             );
             continue;
          }
        }

        if (!product.isActive) {
          stockErrors.push(`${product.name} is no longer available`);
          continue;
        }

          if (!variantIdSuffix && product.stock < item.quantity) {
            stockErrors.push(
              `${product.name}: Only ${product.stock} in stock, requested ${item.quantity}`
            );
            continue;
          }

          productDataMap.set(item.productId, product);
      }

      if (stockErrors.length > 0) {
        throw new Error(`STOCK_ERROR:${JSON.stringify(stockErrors)}`);
      }

      // Step 2: Deduct inventory atomically
      for (const item of items) {
        if (item.isGiftCard) {
          // Gift cards are virtual/digital items: skip inventory deduction
          continue;
        }
        
        const baseProductId = item.productId.split('-')[0];
        const variantIdSuffix = item.productId.substring(baseProductId.length + 1);

        if (variantIdSuffix || item.color || item.size) {
          const product = productDataMap.get(item.productId);
          if (product && Array.isArray(product.productVariants)) {
            const updatedVariants = product.productVariants.map((v: any, idx: number) => {
              const size = typeof v.size === 'string' ? v.size : '';
              const color = typeof v.color === 'string' ? v.color : '';
              const generatedId = v.variantId || `v-${size || 'default'}-${color || 'default'}-${idx}`;

              let isMatch = false;
              if (variantIdSuffix) {
                isMatch = generatedId === variantIdSuffix || v.id === variantIdSuffix;
                if (!isMatch && v.variantId && item.productId.includes(v.variantId)) isMatch = true;
                if (!isMatch && v.id && item.productId.includes(v.id)) isMatch = true;
                if (!isMatch && v.sku && (variantIdSuffix === v.sku || variantIdSuffix.includes(v.sku))) isMatch = true;
                if (!isMatch && v.color && variantIdSuffix.toLowerCase().includes(v.color.split('|')[0].toLowerCase().trim())) isMatch = true;
                if (!isMatch && v.size && variantIdSuffix.toLowerCase().includes(v.size.toLowerCase().trim())) isMatch = true;
              }
              if (!isMatch && (item.color || item.size)) {
                const dbColor = v.color?.split('|')[0]?.toLowerCase().trim();
                const reqColor = item.color?.toLowerCase().trim();
                const dbSize = v.size?.toLowerCase().trim();
                const reqSize = item.size?.toLowerCase().trim();
                
                if (dbColor === reqColor && (dbSize === reqSize || (!dbSize && !reqSize))) {
                  isMatch = true;
                }
              }
              
              if (isMatch) {
                return { ...v, stock: Math.max(0, v.stock - item.quantity) };
              }
              return v;
            });
            await tx.product.update({
              where: { id: baseProductId },
              data: { productVariants: updatedVariants }
            });
          }
        } else {
          await tx.product.update({
            where: { id: baseProductId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Step 3: Handle gift card redemption
      let giftCardDeductionAmount = 0;
      // FIX: Single variable — was previously split into appliedGiftCardId (never assigned)
      // and redeemedCardId (got the value), causing GiftCardRedemption records to never be written.
      let appliedGiftCardId: string | null = null;

      /**
       * Atomically deducts a gift card balance using a single conditional UPDATE.
       * This is race-condition safe with Supabase pgBouncer transaction pooling —
       * SELECT ... FOR UPDATE does NOT survive across pgBouncer statement boundaries,
       * but a single UPDATE WHERE balance >= amount is fully atomic in PostgreSQL.
       *
       * Returns the gift card ID on success, throws on any failure condition.
       */
      const processGiftCardRedemption = async (code: string, amount: number): Promise<string> => {
        if (!code || amount <= 0) throw new Error("Invalid gift card deduction amount");
        const lookupCode = String(code).toUpperCase().trim();
        const validAmount = Number(amount);
        if (isNaN(validAmount) || validAmount <= 0) {
          throw new Error("Invalid gift card deduction amount");
        }

        // Step A: Fetch the card for pre-flight checks (expiry, existence, status)
        const giftCard = await tx.giftCard.findFirst({
          where: {
            OR: [{ code: lookupCode }, { barcode: lookupCode }],
          },
          select: { id: true, balance: true, status: true, isActive: true, expiresAt: true },
        });

        if (!giftCard) {
          throw new Error("Gift card not found.");
        }
        if (!giftCard.isActive || giftCard.status === "DISABLED") {
          throw new Error("Gift card is invalid, inactive, or disabled.");
        }
        if (giftCard.status === "USED" || Number(giftCard.balance) <= 0) {
          throw new Error("This gift card has already been fully redeemed.");
        }
        if (giftCard.status !== "AVAILABLE") {
          throw new Error("Gift card is invalid, inactive, or disabled.");
        }
        const isExpired = giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date();
        if (isExpired) {
          throw new Error("Gift card has expired.");
        }
        if (Number(giftCard.balance) < validAmount) {
          throw new Error(
            `Gift card balance (Rs.${Number(giftCard.balance).toFixed(3)}) is less than deduction amount (Rs.${validAmount.toFixed(3)})`
          );
        }

        // Step B: Single atomic UPDATE — prevents concurrent over-redemption.
        // The WHERE clause re-validates balance and status atomically.
        // rowsAffected === 0 means another request already redeemed/changed this card.
        const finalBalance = Math.max(0, Number(giftCard.balance) - validAmount);
        const finalStatus = finalBalance <= 0 ? "USED" : "AVAILABLE";

        const rowsAffected = await tx.$executeRaw`
          UPDATE "GiftCard"
          SET
            "balance"   = ${finalBalance},
            "status"    = ${finalStatus}::\"GiftCardStatus\",
            "isActive"  = ${finalBalance > 0},
            "updatedAt" = NOW()
          WHERE
            "id"      = ${giftCard.id}
            AND "status"  = 'AVAILABLE'::\"GiftCardStatus\"
            AND "balance" >= ${validAmount}
            AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        `;

        if (rowsAffected === 0) {
          throw new Error(
            "Gift card could not be applied — it may have just been redeemed, expired, or the balance changed. Please re-verify the card."
          );
        }

        return giftCard.id;
      };

      // ── Track split-payment gift card redemptions separately for audit trail ──
      const splitGiftCardRedemptions: Array<{ cardId: string; amount: number }> = [];

      // Process primary gift card (direct POS_GIFT_CARD payment or hybrid deduction)
      const giftCardAmount = giftCardDeduction || 0;
      if (giftCardCode && giftCardAmount > 0) {
        appliedGiftCardId = await processGiftCardRedemption(giftCardCode, giftCardAmount);
        giftCardDeductionAmount = giftCardAmount;
      }

      // Process gift card entries within split payments
      if (paymentMethod === "POS_SPLIT" && splitPayments) {
        for (const sp of splitPayments) {
          if (sp.method === "POS_GIFT_CARD") {
            const spCode = sp.reference?.trim();
            if (!spCode) {
              throw new Error("Gift card code is required for every gift card split entry.");
            }
            if (sp.amount <= 0) continue;
            // Skip if already processed as the primary gift card
            if (spCode.toUpperCase() !== giftCardCode?.toUpperCase()) {
              const splitCardId = await processGiftCardRedemption(spCode, sp.amount);
              splitGiftCardRedemptions.push({ cardId: splitCardId, amount: sp.amount });
            }
          }
        }
      }

      // Step 4: Generate order number
      const orderNumber = `POS-${nanoid(8).toUpperCase()}`;

      // Step 5: Determine user ID (use customer if linked, else operator)
      const orderUserId = customerId || session.user.id;

      // Step 6: Create the order with all line items
      const isByobFlow = items.some((item: any) => item.isCustomBox || item.parentBoxId);

      // Step 6: Create the order (without nested items first)
      const order = await tx.order.create({
        data: {
          orderNumber: orderNumber,
          userId: orderUserId,
          customerName: customerName || "Walk-in Customer",
          customerEmail: "",
          customerPhone: customerPhone || "",
          shippingAddress: { type: "POS_INSTORE", address: "In-Store Purchase" },
          subtotal: subtotal || total,
          deliveryFee: 0,
          freeDeliveryThreshold: 0,
          total: total,
          orderStatus: "DELIVERED",
          paymentMethod: paymentMethod,
          paymentStatus: "PAID",
          paymentConfirmedAt: new Date(),
          orderSource: "POS",
          orderType: isByobFlow ? "CUSTOM_GIFT_BOX" : "STANDARD",
          isBYOB: isByobFlow,
          requestedDeliveryDate: null,
          shiftId: shiftId,
          posShiftId: shiftId,
          giftCardDeduction: giftCardDeductionAmount,
          appliedGiftCardId: appliedGiftCardId,
          remainingPayable: Math.max(0, total - giftCardDeductionAmount),
          gatewayResponse: (
            paymentMethod === "POS_SPLIT"
              ? { splitPayments: splitPayments || [] }
              : (paymentMethod === "POS_CARD" || paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD")
              ? { cardReference: cardReference || "" }
              : paymentMethod === "POS_CASH"
              ? { cashTendered: cashTendered || 0, changeDue: changeDue || 0 }
              : paymentMethod === "POS_GIFT_CARD"
              ? { giftCardCode: giftCardCode || "", giftCardDeduction: giftCardDeductionAmount }
              : {}
          ) as any,
          internalNotes: notes || null,
          statusHistory: {
            create: {
              status: "DELIVERED",
              note: "POS in-store purchase — paid and fulfilled",
              changedByUserId: session.user.id,
              changedByName: session.user.name || "POS Operator",
            },
          },
        },
      });

      // Map to correlate temp IDs with real db order item IDs
      const insertedIdMap = new Map<string, string>();

      // 1st pass: Insert custom parent boxes
      for (const item of items) {
        if (item.isCustomBox) {
          const effectivePrice = item.salePrice || item.unitPrice;
          
          let productImage: string | null = null;
          const productData = productDataMap.get(item.productId);
          if (productData?.productImages) {
            const imgs = productData.productImages as any;
            if (Array.isArray(imgs) && imgs.length > 0) {
              productImage = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url || null;
            }
          }

          const parentItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              productName: item.productName || "Custom Gift Box",
              productNameAr: item.productNameAr || null,
              productImage: productImage,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              salePrice: item.salePrice || null,
              subtotal: effectivePrice * item.quantity,
              isCustomBox: true,
              customBoxConfig: item.customBoxConfig || {},
              sku: productData?.sku || item.productId,
              discountName: item.discountName || null,
              discountValue: item.discountValue || null,
            }
          });

          if (item.id) {
            insertedIdMap.set(item.id, parentItem.id);
          }
        }
      }

      // 2nd pass: Insert all other items
      for (const item of items) {
        if (item.isCustomBox) continue;

        if (item.isGiftCard) {
          const effectivePrice = item.salePrice || item.unitPrice;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: "pos-gift-card",
              productName: item.productName || "Gift Card",
              productNameAr: item.productNameAr || "بطاقة هدية",
              productImage: null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              salePrice: item.salePrice || null,
              subtotal: effectivePrice * item.quantity,
              discountName: item.discountName || null,
              discountValue: item.discountValue || null,
              sku: "GIFT-CARD",
            }
          });
          continue;
        }

        const productData = productDataMap.get(item.productId);
        let productImage: string | null = null;
        if (productData?.productImages) {
          const imgs = productData.productImages as any;
          if (Array.isArray(imgs) && imgs.length > 0) {
            productImage = typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url || null;
          }
        }

        const effectivePrice = item.salePrice || item.unitPrice;
        const baseProductId = item.productId.split('-')[0];
        const variantIdSuffix = item.productId.substring(baseProductId.length + 1);
        
        let resolvedSku = productData?.sku;
        let variantDetails: any = null;
        
        if ((variantIdSuffix || item.color || item.size) && Array.isArray(productData?.productVariants)) {
          const variants = productData.productVariants as any[];
          const variant = variants.find((v: any, idx: number) => {
            const size = typeof v.size === 'string' ? v.size : '';
            const color = typeof v.color === 'string' ? v.color : '';
            const generatedId = v.variantId || `v-${size || 'default'}-${color || 'default'}-${idx}`;

            if (variantIdSuffix) {
              if (generatedId === variantIdSuffix || v.id === variantIdSuffix) return true;
              if (v.variantId && item.productId.includes(v.variantId)) return true;
              if (v.id && item.productId.includes(v.id)) return true;
              if (v.sku && (variantIdSuffix === v.sku || variantIdSuffix.includes(v.sku))) return true;
              if (v.color && variantIdSuffix.toLowerCase().includes(v.color.split('|')[0].toLowerCase().trim())) return true;
              if (v.size && variantIdSuffix.toLowerCase().includes(v.size.toLowerCase().trim())) return true;
            }
            const dbColor = v.color?.split('|')[0]?.toLowerCase().trim();
            const reqColor = item.color?.toLowerCase().trim();
            const dbSize = v.size?.toLowerCase().trim();
            const reqSize = item.size?.toLowerCase().trim();
            
            if (reqColor || reqSize) {
               return dbColor === reqColor && (dbSize === reqSize || (!dbSize && !reqSize));
            }
            return false;
          });
          
          if (variant) {
            // Business rule: Always use the base product's SKU, do not override with variant.sku or variantId
            
            variantDetails = {
              color: variant.color || null,
              size: variant.size || null,
            };
          }
        }

        if (!resolvedSku) {
          resolvedSku = productData?.id || baseProductId || "N/A";
        }

        // Link parent box if specified
        let parentBoxId: string | null = null;
        if (item.parentBoxId) {
          parentBoxId = insertedIdMap.get(item.parentBoxId) || item.parentBoxId;
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: baseProductId,
            sku: resolvedSku,
            variantDetails: variantDetails,
            productName: item.productName || productData?.name || "Unknown Product",
            productNameAr: item.productNameAr || productData?.nameAr || null,
            productImage: productImage,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            salePrice: item.salePrice || null,
            subtotal: effectivePrice * item.quantity,
            discountName: item.discountName || null,
            discountValue: item.discountValue || null,
            parentBoxId: parentBoxId,
          }
        });
      }

      // Step 7: Create gift card redemption records for audit trail
      // Primary gift card (POS_GIFT_CARD or hybrid deduction)
      if (appliedGiftCardId && giftCardDeductionAmount > 0) {
        await tx.giftCardRedemption.create({
          data: {
            giftCardId: appliedGiftCardId,
            orderId: order.id,
            amount: giftCardDeductionAmount,
            channel: "POS",
          },
        });
      }

      // Split payment gift cards — each gets its own redemption record
      for (const splitGc of splitGiftCardRedemptions) {
        await tx.giftCardRedemption.create({
          data: {
            giftCardId: splitGc.cardId,
            orderId: order.id,
            amount: splitGc.amount,
            channel: "POS",
          },
        });
      }

      // ──────────────────────────────────────────────────
      // Step 8: Gift Card Issuance Activation
      // ──────────────────────────────────────────────────
      const activatedCodes: string[] = [];
      const giftCardItems = items.filter((item) => item.isGiftCard && item.giftCardCode);

      if (giftCardItems.length > 0) {
        for (const item of giftCardItems) {
          const lookupCode = String(item.giftCardCode).toUpperCase().trim();
          const activationValue = Number(item.salePrice || item.unitPrice);

          if (!lookupCode || activationValue <= 0) {
            throw new Error(`Invalid activation entry: code='${lookupCode}', value=${activationValue}`);
          }

          // Pre-flight: find the card
          const targetCard = await tx.giftCard.findFirst({
            where: {
              OR: [{ code: lookupCode }, { barcode: lookupCode }],
            },
            select: { id: true, code: true, isActive: true, balance: true, status: true, isPhysical: true, purchasedInOrderId: true },
          });

          if (!targetCard) {
            throw new Error(`Gift card not found for activation: ${lookupCode}`);
          }
          if (targetCard.purchasedInOrderId) {
            throw new Error(`Gift card ${lookupCode} has already been sold in a previous order.`);
          }
          if (targetCard.isActive || targetCard.balance > 0) {
            throw new Error(`Gift card ${lookupCode} is already active. It cannot be re-activated.`);
          }
          if (targetCard.status !== "DISABLED") {
            throw new Error(`Gift card ${lookupCode} is not in a DISABLED state and cannot be activated.`);
          }

          // Atomic activation: only succeeds if card is still unactivated and in DISABLED status
          const rowsAffected = await tx.$executeRaw`
            UPDATE "GiftCard"
            SET
              "balance"            = ${activationValue},
              "initialValue"       = ${activationValue},
              "isActive"           = true,
              "isPhysical"         = ${item.isPhysical !== undefined ? Boolean(item.isPhysical) : Boolean(targetCard.isPhysical)},
              "type"               = ${item.isPhysical ? 'PRINTED' : 'DIGITAL'}::"GiftCardType",
              "status"             = 'AVAILABLE'::"GiftCardStatus",
              "purchasedInOrderId" = ${order.id},
              "recipientEmail"     = ${item.recipientEmail || null},
              "personalMessage"    = ${item.personalMessage || null},
              "deliveryStatus"     = ${item.isPhysical ? 'SENT' : 'PENDING'}::"GiftCardDeliveryStatus",
              "updatedAt"          = NOW()
            WHERE
              "id"       = ${targetCard.id}
              AND "status"   = 'DISABLED'::"GiftCardStatus"
              AND "isActive" = false
              AND "balance"  = 0
          `;

          if (rowsAffected === 0) {
            throw new Error(
              `Gift card ${lookupCode} could not be activated — it may have already been activated by a concurrent transaction.`
            );
          }

          activatedCodes.push(targetCard.code);
        }
      }

      if (paymentMethod === "POS_CREDIT") {
        if (!customerId) throw new Error("Customer ID is missing for POS_CREDIT");
        // Create debit ledger entry
        await tx.customerLedger.create({
          data: {
            userId: customerId,
            amount: total,
            type: "DEBIT",
            description: `Store credit purchase for order ${order.orderNumber}`,
            orderId: order.id,
            paymentMethod: "POS_CREDIT",
          }
        });

        // Update user balance
        await tx.user.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: total } }
        });
      }

      const finalOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true }
      });

      return { order: finalOrder!, activatedCodes };
    }, {
      timeout: 20000,
    });

    // Fire-and-forget: Async delivery of eGift card emails
    issueGiftCards(result.order.id).catch(err => {
      console.error("[POS Checkout] Async gift card issuance failed:", err);
    });

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        paymentMethod: result.order.paymentMethod,
        paymentStatus: result.order.paymentStatus,
        itemCount: (result.order as any).items?.length ?? 0,
        createdAt: result.order.createdAt.toISOString(),
        activatedCodes: result.activatedCodes,
      },
    });
  } catch (error: any) {
    console.error("[POS Checkout] Error:", error?.code, error?.message, error?.meta);

    if (error.message?.startsWith("STOCK_ERROR:")) {
      const errors = JSON.parse(error.message.replace("STOCK_ERROR:", ""));
      return NextResponse.json(
        { success: false, message: "Insufficient stock", errors },
        { status: 409 }
      );
    }

    if (error.code === "P2028") {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction timed out. Please try again.",
        },
        { status: 504 }
      );
    }

    // Prisma foreign key constraint violation
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          message: `Database constraint error: ${error.meta?.field_name || "unknown field"}. Please contact support.`,
          debug: { code: error.code, meta: error.meta },
        },
        { status: 400 }
      );
    }

    // Prisma record not found
    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: `Record not found: ${error.meta?.cause || error.message}`,
        },
        { status: 400 }
      );
    }

    const badRequestErrors = [
      "Gift card is invalid, inactive, or disabled.",
      "This gift card has already been fully redeemed.",
      "Gift card has expired",
      "Invalid gift card deduction amount",
      "is less than deduction amount",
    ];

    if (badRequestErrors.some(msg => error.message?.includes(msg))) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
        debug: { code: error.code, meta: error.meta },
      },
      { status: 500 }
    );
  }
}
