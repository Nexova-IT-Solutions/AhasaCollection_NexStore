import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { ensureShippingConfig } from "@/lib/shipping-config";
// Force rebuild to sync Prisma Client types
import { issueGiftCards } from "@/lib/giftcard/issueGiftCards";
import type { PaymentMethod } from "@prisma/client";
import { AddressType } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

interface CheckoutItem {
  productId?: string;
  id?: string;
  variantId?: string;
  quantity: number;
  discountId?: string;
  type?: string;
  isDigital?: boolean;
  name?: string;
  price?: number;
  image?: string;
  virtualGiftCard?: {
    initialValue: number;
    currency: string;
  };
  customBox?: any;
  customBoxConfig?: any;
}

interface CheckoutPayload {
  items: CheckoutItem[];
  shippingAddress: {
    contactName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province?: string;
    postalCode: string;
  };
  billingAddress?: {
    contactName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province?: string;
    postalCode?: string;
  };
  customerPhone: string;
  isGift?: boolean;
  giftMessage?: string;
  giftWrapId?: string;
  noteStyle?: string;
  sender?: {
    name: string;
    phone: string;
  };
  recipient?: {
    name: string;
    phone: string;
    email?: string;
  };
  revealSender?: boolean;
  suppressInvoice?: boolean;
  paymentMethod?: "COD" | "DIRECTPAY" | "MINTPAY" | "GIFT_CARD" | "BANK_TRANSFER";
  appliedGiftCardId?: string;
  packagingId?: string;
  saveAddress?: boolean;
  bankAccountId?: string;
  orderType?: string;
  requestedDeliveryDate?: string | null;
  // BYOB-specific fields
  isByob?: boolean;
  byobData?: {
    items: Array<{ productId: string; name: string; quantity: number; price: number; image: string }>;
    message?: string;
    wrapping?: { id: string; name: string; price: number; imageUrl?: string; image?: string };
  };
}

function resolveProductImageSnapshot(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = resolveProductImageSnapshot(item);
      if (url) return url;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    return (
      resolveProductImageSnapshot(candidate.thumbnail) ||
      resolveProductImageSnapshot(candidate.url) ||
      resolveProductImageSnapshot(candidate.image)
    );
  }

  return null;
}

/**
 * POST /api/checkout
 * Secure checkout endpoint - creates order with atomic transaction
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Auth Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Step 2: Parse and validate request body
    const payload: CheckoutPayload = await request.json();

    // Validate requestedDeliveryDate using Zod
    if (payload.requestedDeliveryDate) {
      const deliveryDateSchema = z.string()
        .datetime()
        .nullable()
        .optional()
        .refine((val) => {
          if (!val) return true;
          const date = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date >= today;
        }, {
          message: "Delivery date cannot be in the past"
        });

      const dateValidation = deliveryDateSchema.safeParse(payload.requestedDeliveryDate);
      if (!dateValidation.success) {
        return NextResponse.json(
          { success: false, message: dateValidation.error.errors[0]?.message || "Invalid delivery date" },
          { status: 400 }
        );
      }
    }

    // For BYOB orders the items[] array is intentionally empty — byobData carries the real items
    if (!payload.isByob && (!payload.items || payload.items.length === 0)) {
      return NextResponse.json(
        { success: false, message: "No items in checkout" },
        { status: 400 }
      );
    }

    if (!payload.shippingAddress) {
      return NextResponse.json(
        { success: false, message: "Shipping address is required" },
        { status: 400 }
      );
    }

    if (!payload.customerPhone) {
      return NextResponse.json(
        { success: false, message: "Contact phone number is required" },
        { status: 400 }
      );
    }

    if (payload.isGift) {
      if (!payload.sender?.name?.trim() || !payload.sender?.phone?.trim()) {
        return NextResponse.json(
          { success: false, message: "Sender name and phone are required for gift orders" },
          { status: 400 }
        );
      }

      if (!payload.recipient?.name?.trim() || !payload.recipient?.phone?.trim()) {
        return NextResponse.json(
          { success: false, message: "Recipient name and phone are required for gift orders" },
          { status: 400 }
        );
      }
    }

    const isCustomGiftBox = payload.orderType === "CUSTOM_GIFT_BOX";
    const isByobFlow = payload.isByob || isCustomGiftBox || payload.items?.some(item => item.type === "custombox");

    const productItems = payload.items.filter(item =>
      item.type !== 'giftcard' &&
      item.type !== 'custombox' &&
      !item.isDigital &&
      !item.productId?.startsWith('giftcard-') &&
      (item.productId || item.id)
    );
    const customBoxItems = payload.items.filter(item => item.type === 'custombox');
    const giftCardItems = payload.items.filter(item =>
      (item.type === 'giftcard' || item.isDigital || item.productId?.startsWith('giftcard-')) &&
      item.virtualGiftCard
    );

    // Resolve products for validation & query
    const productIdsToFetch = new Set<string>();
    
    // Add standard products
    productItems.forEach(item => {
      const pid = item.productId || item.id;
      if (pid) productIdsToFetch.add(pid);
    });

    // Add child items from custom boxes in standard cart
    customBoxItems.forEach(item => {
      const customBox = item.customBox || item.customBoxConfig;
      const boxItems = customBox?.items || [];
      boxItems.forEach((subItem: any) => {
        const subPid = subItem.productId || subItem.id || subItem.item?.id;
        if (subPid) productIdsToFetch.add(subPid);
      });
    });

    // Add items from direct BYOB flow
    if (payload.isByob && payload.byobData?.items?.length) {
      payload.byobData.items.forEach(i => {
        if (i.productId) productIdsToFetch.add(i.productId);
      });
    }

    const productIds = Array.from(productIdsToFetch);

    // Validate quantities are positive
    if (payload.isByob && payload.byobData?.items?.length) {
      for (const item of payload.byobData.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          return NextResponse.json(
            { success: false, message: `Invalid quantity for item ${item.productId}` },
            { status: 400 }
          );
        }
      }
    }
    for (const item of productItems) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
          { success: false, message: `Invalid quantity for item ${item.productId || item.id}` },
          { status: 400 }
        );
      }
    }
    for (const item of customBoxItems) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
          { success: false, message: `Invalid quantity for custom box item` },
          { status: 400 }
        );
      }
      const customBox = item.customBox || item.customBoxConfig;
      const boxItems = customBox?.items || [];
      for (const subItem of boxItems) {
        if (!Number.isInteger(subItem.quantity) || subItem.quantity < 1) {
          return NextResponse.json(
            { success: false, message: `Invalid quantity inside custom box` },
            { status: 400 }
          );
        }
      }
    }
    for (const gcItem of giftCardItems) {
      if (!Number.isInteger(gcItem.quantity) || gcItem.quantity < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid quantity for gift card item" },
          { status: 400 }
        );
      }
    }

    if (productIds.length === 0 && giftCardItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid cart items: No valid items found" },
        { status: 400 }
      );
    }

    // Step 3: Atomic Transaction
    const order = await db.$transaction(async (tx) => {
      const normalizedPaymentMethod =
        (payload.paymentMethod?.toUpperCase() || "COD") as PaymentMethod;

      // 3a. Upsert & fetch ShippingConfig
      const config = await ensureShippingConfig(tx as any);

      // Check if delivery is enabled
      if (!config.isDeliveryEnabled) {
        throw new Error("Delivery is currently disabled");
      }

      // 3b. Fetch all products from DB
      const dbProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        include: {
          discount: true,
          itemsInside: {
            include: {
              item: true
            }
          }
        },
      });

      // Create a map for quick lookup
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Calculate total requested quantities and subtotal
      const requestedQuantities = new Map<string, number>();
      let orderSubtotal = 0;

      // 1. Standard items
      for (const item of productItems) {
        const pid = item.productId || item.id;
        if (pid) {
          requestedQuantities.set(pid, (requestedQuantities.get(pid) || 0) + item.quantity);
          const product = productMap.get(pid);
          if (!product) {
            throw new Error(`Product ${pid} not found or inactive`);
          }
          const salePrice = product.salePrice || product.price;
          orderSubtotal += salePrice * item.quantity;
        }
      }

      // 2. Custom box items from standard cart
      for (const item of customBoxItems) {
        const customBox = item.customBox || item.customBoxConfig;
        const boxType = customBox?.boxType || { basePrice: 0 };
        const wrapping = customBox?.wrapping || { price: 0 };
        const wrapPrice = wrapping.price || 0;
        const basePrice = boxType.basePrice || 0;
        let childItemsSum = 0;

        const boxItems = customBox?.items || [];
        for (const subItem of boxItems) {
          const subPid = subItem.productId || subItem.id || subItem.item?.id;
          if (subPid) {
            const qty = (subItem.quantity || 1) * item.quantity;
            requestedQuantities.set(subPid, (requestedQuantities.get(subPid) || 0) + qty);
            const product = productMap.get(subPid);
            if (!product) {
              throw new Error(`Product ${subPid} inside custom box not found or inactive`);
            }
            const salePrice = product.salePrice || product.price;
            childItemsSum += salePrice * (subItem.quantity || 1);
          }
        }
        orderSubtotal += (wrapPrice + basePrice + childItemsSum) * item.quantity;
      }

      // 3. Direct BYOB flow
      if (payload.isByob && payload.byobData?.items?.length) {
        let childItemsSum = 0;

        payload.byobData.items.forEach(i => {
          if (i.productId) {
            requestedQuantities.set(i.productId, (requestedQuantities.get(i.productId) || 0) + i.quantity);
            const product = productMap.get(i.productId);
            if (!product) {
              throw new Error(`Product ${i.productId} in BYOB not found or inactive`);
            }
            const salePrice = product.salePrice || product.price;
            childItemsSum += salePrice * i.quantity;
          }
        });
        orderSubtotal += childItemsSum;
      }

      // 4. Gift Cards
      let digitalGiftCardSubtotal = 0;
      for (const gcItem of giftCardItems) {
        const initialValue = gcItem.virtualGiftCard!.initialValue;
        const itemSubtotal = initialValue * gcItem.quantity;
        orderSubtotal += itemSubtotal;
        digitalGiftCardSubtotal += itemSubtotal;
      }

      // Validate stock before ANY writes
      for (const [pid, qty] of requestedQuantities.entries()) {
        const product = productMap.get(pid)!;
        if (product.stock < qty) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${qty}`
          );
        }

        // Deep verification for Premium Gift Boxes
        if (product.isPremiumGiftBox && product.itemsInside && product.itemsInside.length > 0) {
          for (const childRelationship of product.itemsInside) {
            const childItem = childRelationship.item;
            const requiredChildQuantity = childRelationship.quantity * qty;
            if (childItem.stock < requiredChildQuantity) {
              throw new Error(
                `Gift box "${product.name}" is unavailable because the contained item "${childItem.name}" is out of stock.`
              );
            }
          }
        }
      }

      // 3f. Calculate delivery fee and validate active cities & provinces
      const hasPhysicalItems = productItems.length > 0 || customBoxItems.length > 0 || payload.isByob;
      const physicalSubtotal = orderSubtotal - digitalGiftCardSubtotal;

      let verifiedProvince = null;
      let verifiedCity = null;
      let activeCityFee = config.deliveryFee;

      if (hasPhysicalItems && payload.shippingAddress && payload.shippingAddress.city) {
        const dbCity = await tx.city.findFirst({
          where: {
            name: payload.shippingAddress.city,
            isActive: true,
            province: {
              isActive: true
            }
          },
          include: {
            province: true
          }
        });

        if (!dbCity) {
          // City not mandatory for now, allow placing the order
          verifiedCity = payload.shippingAddress.city;
          verifiedProvince = payload.shippingAddress.province || "Unknown";
          activeCityFee = config.deliveryFee;
        } else {
          verifiedCity = dbCity.name;
          verifiedProvince = dbCity.province.name;
          activeCityFee = dbCity.fee;
        }
        
        // Enrich payload shipping address with verified province
        payload.shippingAddress.province = verifiedProvince;
      }

      const deliveryFee = hasPhysicalItems
        ? (config.isFreeDeliveryEnabled && physicalSubtotal >= config.freeDeliveryThreshold ? 0 : activeCityFee)
        : 0;

      // 3f-2. Calculate gift wrap fee
      let wrapFee = 0;
      let wrapId = null;
      let wrapName = null;

      if (payload.giftWrapId) {
        const selectedWrap = await tx.giftWrap.findUnique({
          where: { id: payload.giftWrapId },
        });
        if (selectedWrap) {
          wrapFee = selectedWrap.price;
          wrapId = selectedWrap.id;
          wrapName = selectedWrap.name;
        }
      }

      const totalBeforeGiftCard = orderSubtotal + deliveryFee + wrapFee;
      let giftCardDeduction = 0;
      let remainingPayable = totalBeforeGiftCard;
      let appliedGiftCard = null;

      // 3f-3. Process Gift Card
      if (payload.appliedGiftCardId) {
        const lookupId = String(payload.appliedGiftCardId).trim();
        const giftCards = await tx.$queryRaw<any[]>`
          SELECT * FROM "GiftCard" 
          WHERE "id" = ${lookupId} OR "code" = ${lookupId} OR "barcode" = ${lookupId}
          LIMIT 1 
          FOR UPDATE
        `;
        appliedGiftCard = giftCards?.[0];

        if (!appliedGiftCard || appliedGiftCard.status === "DISABLED" || !appliedGiftCard.isActive) {
          throw new Error("Applied gift card is invalid, inactive, or disabled.");
        }

        if (appliedGiftCard.status === "USED" || Number(appliedGiftCard.balance) <= 0) {
          throw new Error("Applied gift card has already been fully redeemed.");
        }

        const isExpired = appliedGiftCard.expiresAt && new Date(appliedGiftCard.expiresAt) < new Date();
        if (isExpired) {
          throw new Error("Applied gift card has expired");
        }

        giftCardDeduction = Math.min(totalBeforeGiftCard, Number(appliedGiftCard.balance));
        remainingPayable = totalBeforeGiftCard - giftCardDeduction;

        const validAmount = Number(giftCardDeduction);
        const finalBalance = Math.max(0, Number(appliedGiftCard.balance) - validAmount);
        const finalStatus = finalBalance <= 0 ? "USED" : "AVAILABLE";

        await tx.giftCard.update({
          where: { id: appliedGiftCard.id },
          data: {
            balance: finalBalance,
            status: finalStatus,
            isActive: finalBalance > 0,
            heldUntil: null,
            heldByOrderId: null,
          },
        });
      }

      const orderPaymentStatus = remainingPayable <= 0 ? "PAID" : "PENDING";
      let finalPaymentMethod = remainingPayable <= 0 ? "GIFT_CARD" : normalizedPaymentMethod;

      // 3f-4. Calculate Payment Fee
      let paymentFee = 0;
      if (remainingPayable > 0 && finalPaymentMethod !== "GIFT_CARD") {
        const gateway = await tx.paymentGateway.findUnique({
          where: { name: finalPaymentMethod as any },
        });
        if (gateway && gateway.isActive) {
          if (gateway.feeType === "PERCENTAGE") {
            paymentFee = remainingPayable * (gateway.feeValue / 100);
          } else if (gateway.feeType === "FIXED") {
            paymentFee = gateway.feeValue;
          }
        }
      }

      const finalTotal = Math.max(0, totalBeforeGiftCard - giftCardDeduction) + paymentFee;
      const finalRemainingPayable = Math.max(0, remainingPayable) + paymentFee;

      // 3g. Generate human-readable orderNumber
      const year = new Date().getFullYear();
      const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F7C2"
      const orderNumber = `GBL-${year}-${randomHex}`;

      // 3h. Create Order with snapshots (without nested items first)
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          requestedDeliveryDate: payload.requestedDeliveryDate ? new Date(payload.requestedDeliveryDate) : null,
          customerName:
            payload.isGift && payload.recipient?.name
              ? payload.recipient.name
              : payload.shippingAddress.contactName,
          customerEmail: session.user.email || "",
          customerPhone:
            payload.isGift && payload.recipient?.phone
              ? payload.recipient.phone
              : payload.customerPhone,
          billingAddress: payload.billingAddress ? (payload.billingAddress as any) : undefined,
          shippingAddress: payload.shippingAddress as any,
          shippingProvince: verifiedProvince,
          shippingCity: verifiedCity,
          recipientName: payload.recipient?.name || null,
          recipientEmail: payload.recipient?.email || null,
          recipientPhone: payload.recipient?.phone || null,
          senderName: payload.sender?.name || null,
          senderPhone: payload.sender?.phone || null,
          subtotal: orderSubtotal,
          deliveryFee,
          paymentFee,
          freeDeliveryThreshold: config.freeDeliveryThreshold,
          total: finalTotal,
          appliedGiftCardId: payload.appliedGiftCardId,
          giftCardDeduction,
          remainingPayable: finalRemainingPayable,
          orderStatus: "PENDING",
          paymentMethod: finalPaymentMethod,
          paymentStatus: orderPaymentStatus,
          bankAccountId: payload.bankAccountId || null,
          isGift: Boolean(payload.isGift),
          giftMessage: payload.giftMessage,
          giftWrapping: Boolean(wrapId),
          noteStyle: payload.noteStyle,
          revealSender: payload.revealSender ?? true,
          suppressInvoice: payload.suppressInvoice ?? false,
          giftWrapId: wrapId,
          giftWrapName: wrapName,
          giftWrapPrice: wrapFee,
          orderSource: isByobFlow ? "BYOB" : "WEB",
          orderType: isByobFlow ? "CUSTOM_GIFT_BOX" : "STANDARD",
          isBYOB: isByobFlow,
          byobData: isByobFlow
            ? ({
              items: payload.isByob && payload.byobData?.items
                ? payload.byobData.items
                : payload.items.map(i => ({
                  productId: i.productId || i.id || "",
                  quantity: i.quantity,
                  price: i.price || 0,
                  name: i.name || "",
                  image: i.image || "",
                })),
              message: payload.giftMessage || payload.byobData?.message || undefined,
              wrapping: wrapId ? {
                id: wrapId,
                name: wrapName || "",
                price: wrapFee,
              } : (payload.byobData?.wrapping || undefined),
            } as any)
            : undefined,
          giftCardRedemptions: payload.appliedGiftCardId ? {
            create: {
              giftCardId: payload.appliedGiftCardId,
              amount: giftCardDeduction,
              channel: "WEB",
            }
          } : undefined,
          statusHistory: {
            create: {
              status: "PENDING",
              note: isByobFlow ? "BYOB Order placed via Box Builder" : "Order placed successfully",
              changedByUserId: session.user.id,
              changedByName: session.user.name || session.user.email || "Customer",
            },
          },
        },
      });

      // Insert order items inside the transaction
      // 1. Standard product items
      for (const item of productItems) {
        const product = productMap.get(item.productId || item.id!)!;
        let unitPrice = product.price;
        let salePrice = product.salePrice || product.price;
        let variantName = null;
        let isVariantMatch = false;
        let resolvedSku = product.sku;
        let variantDetails: any = null;

        if (item.variantId && Array.isArray(product.productVariants)) {
          const variantIdSuffix = item.variantId;
          const variant = (product.productVariants as any[]).find((v: any) => {
            if (v.variantId === variantIdSuffix || v.id === variantIdSuffix || item.productId?.includes(v.variantId) || item.productId?.includes(v.id)) {
              return true;
            }
            if (v.sku && (variantIdSuffix === v.sku || variantIdSuffix.includes(v.sku))) {
              return true;
            }
            if (v.color && variantIdSuffix.toLowerCase().includes(v.color.split('|')[0].toLowerCase().trim())) {
              return true;
            }
            return false;
          });
          if (variant) {
            isVariantMatch = true;
            if (typeof variant.price === 'number') {
              unitPrice = variant.price;
              salePrice = variant.price;
            }
            // Business rule: Always use the base product's SKU, do not override with variant.sku or variantId
            variantDetails = {
              color: variant.color || null,
              size: variant.size || null,
            };
            variantName = variant.color ? `${variant.size} / ${variant.color.split('|')[0]}`.trim() : variant.size;
          }
        }

        if (!resolvedSku) {
          resolvedSku = product.id || "N/A";
        }

        const itemSubtotal = salePrice * item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: product.id,
            sku: resolvedSku,
            variantDetails: variantDetails,
            productName: isVariantMatch && variantName ? `${product.name} - ${variantName}` : product.name,
            productNameAr: product.nameAr || null,
            productImage: resolveProductImageSnapshot(product.productImages),
            quantity: item.quantity,
            unitPrice,
            salePrice,
            subtotal: itemSubtotal,
            discountId: item.discountId || null,
            discountName: product.discount?.name || null,
            discountValue: product.discount?.value || null,
          }
        });
      }

      // 2. Custom box items from standard cart
      for (const item of customBoxItems) {
        const customBox = item.customBox || item.customBoxConfig;
        const boxType = customBox?.boxType || { basePrice: 0, name: "Custom Gift Box", id: "standard-custom-box" };
        const wrapping = customBox?.wrapping || { price: 0, name: "Standard Eco-friendly Packing" };
        const wrapPrice = wrapping.price || 0;
        const basePrice = boxType.basePrice || 0;
        const parentPrice = wrapPrice + basePrice;

        const parentItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: boxType.id || "custom-gift-box",
            productName: boxType.name || "Custom Gift Box",
            productNameAr: boxType.nameAr || "علبة هدايا مخصصة",
            productImage: wrapping.imageUrl || wrapping.image || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100&h=100&fit=crop",
            quantity: item.quantity,
            unitPrice: parentPrice,
            salePrice: parentPrice,
            subtotal: parentPrice * item.quantity,
            isCustomBox: true,
            customBoxConfig: {
              wrapping,
              message: customBox?.message || customBox?.giftMessage || "",
              boxType
            }
          }
        });

        // Create child items
        const boxItems = customBox?.items || [];
        for (const subItem of boxItems) {
          const subPid = subItem.productId || subItem.id || subItem.item?.id;
          const product = productMap.get(subPid);
          if (!product) continue;
          let unitPrice = product.price;
          let salePrice = product.salePrice || product.price;
          const totalQty = subItem.quantity * item.quantity;
          const itemSubtotal = salePrice * totalQty;

          await tx.orderItem.create({
            data: {
              orderId: createdOrder.id,
              productId: product.id,
              productName: product.name,
              productNameAr: product.nameAr || null,
              productImage: resolveProductImageSnapshot(product.productImages),
              quantity: totalQty,
              unitPrice,
              salePrice,
              subtotal: itemSubtotal,
              parentBoxId: parentItem.id,
              sku: product.sku || product.id,
            }
          });
        }
      }

      // 3. Direct BYOB flow
      if (payload.isByob && payload.byobData?.items?.length) {
        const wrapping = payload.byobData.wrapping || { price: 0, name: "Standard Eco-friendly Packing" };
        
        const parentItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: wrapping.id || "custom-gift-box",
            productName: "Custom Gift Box",
            productNameAr: "علبة هدايا مخصصة",
            productImage: wrapping.imageUrl || wrapping.image || "/images/giftbox-placeholder.png",
            quantity: 1,
            unitPrice: wrapFee,
            salePrice: wrapFee,
            subtotal: wrapFee,
            isCustomBox: true,
            customBoxConfig: {
              wrapping,
              message: payload.giftMessage || payload.byobData?.message || ""
            }
          }
        });

        for (const item of payload.byobData.items) {
          const product = productMap.get(item.productId);
          if (!product) continue;
          let unitPrice = product.price;
          let salePrice = product.salePrice || product.price;
          const itemSubtotal = salePrice * item.quantity;

          await tx.orderItem.create({
            data: {
              orderId: createdOrder.id,
              productId: product.id,
              productName: product.name,
              productNameAr: product.nameAr || null,
              productImage: resolveProductImageSnapshot(product.productImages),
              quantity: item.quantity,
              unitPrice,
              salePrice,
              subtotal: itemSubtotal,
              parentBoxId: parentItem.id,
              sku: product.sku || product.id,
            }
          });
        }
      }

      // 4. Gift Cards
      for (const gcItem of giftCardItems) {
        const initialValue = gcItem.virtualGiftCard!.initialValue;
        const currency = gcItem.virtualGiftCard!.currency;
        const itemSubtotal = initialValue * gcItem.quantity;

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: "digital-gift-card",
            sku: "GIFT-CARD",
            productName: `Digital Gift Card - ${currency} ${initialValue}`,
            productNameAr: `بطاقة هدية رقمية - ${currency} ${initialValue}`,
            quantity: gcItem.quantity,
            unitPrice: initialValue,
            salePrice: initialValue,
            subtotal: itemSubtotal,
          }
        });
      }

      // 3j. Decrement stock for each product
      for (const [pid, qty] of requestedQuantities.entries()) {
        await tx.product.update({
          where: { id: pid },
          data: {
            stock: {
              decrement: qty,
            },
          },
          select: {
            id: true,
          },
        });

        // Also decrement child items if it's a premium gift box
        const product = productMap.get(pid)!;
        if (product.isPremiumGiftBox && product.itemsInside && product.itemsInside.length > 0) {
          for (const childRelationship of product.itemsInside) {
            const childItem = childRelationship.item;
            const requiredChildQuantity = childRelationship.quantity * qty;
            await tx.product.update({
              where: { id: childItem.id },
              data: {
                stock: {
                  decrement: requiredChildQuantity,
                },
              },
            });
          }
        }
      }

      // 3i. Save as default delivery address (inside the same transaction for consistency)
      if (payload.saveAddress === true && !payload.isGift) {
        const addr = payload.shippingAddress;
        if (addr?.addressLine1 && addr.city) {
          await tx.address.updateMany({
            where: {
              userId: session.user.id,
              type: AddressType.DELIVERY,
              isDefault: true,
            },
            data: { isDefault: false },
          });

          await tx.address.create({
            data: {
              userId: session.user.id,
              type: AddressType.DELIVERY,
              contactName: addr.contactName,
              phoneNumber: addr.phoneNumber,
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2 || null,
              city: addr.city,
              province: addr.province || null,
              postalCode: addr.postalCode || "",
              isDefault: true,
            },
          });
        }
      }

      // 3l. Clear the user's cart in the database
      await tx.cart.updateMany({
        where: { userId: session.user.id },
        data: { items: "[]" },
      });

      const finalOrder = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: { items: true }
      });

      return finalOrder!;
    }, {
      // maxWait: how long (ms) Prisma waits to acquire a free connection from the
      //   pool before throwing P2028 "Unable to start a transaction in the given time".
      //   Default is 2 000 ms — too short when the pool is under load.
      maxWait: 10000,
      // timeout: how long the transaction body itself may run once started.
      timeout: 15000,
    });

    // 4. Trigger gift card issuance after transaction is fully committed
    if ((order.paymentStatus === "PAID" || order.paymentMethod === "COD") && order.paymentMethod !== "BANK_TRANSFER") {
      issueGiftCards(order.id).catch(err => console.error("Gift card issuance failed:", err));
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        redirectUrl: null, // Future: Payment gateway integration
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[checkout] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Checkout failed";

    return NextResponse.json(
      { success: false, message: errorMessage },
      {
        status:
          error instanceof Error && (errorMessage.includes("stock") || errorMessage.includes("unavailable"))
            ? 400
            : 500,
      }
    );
  }
}
