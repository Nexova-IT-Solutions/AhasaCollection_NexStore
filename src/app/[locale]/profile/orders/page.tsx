import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CustomerOrdersClient } from "@/components/profile/orders/customer-orders-client";

type ProductImageRecord = {
  url: string;
  isMain: boolean;
};

function parseProductImages(value: unknown): ProductImageRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const image = item as { url?: unknown; isMain?: unknown };
      if (typeof image.url !== "string" || !image.url.trim()) return null;

      return {
        url: image.url,
        isMain: typeof image.isMain === "boolean" ? image.isMain : false,
      };
    })
    .filter((item): item is ProductImageRecord => Boolean(item));
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parsedImages = parseProductImages(value);
    const mainImage = parsedImages.find((image) => image.isMain)?.url;
    if (mainImage) return mainImage;

    for (const item of value) {
      const url = normalizeImageUrl(item);
      if (url) return url;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      normalizeImageUrl(record.thumbnail) ||
      normalizeImageUrl(record.url) ||
      normalizeImageUrl(record.image)
    );
  }

  return null;
}

export default async function OrdersPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
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
          parentBoxId: true,
          isCustomBox: true,
          customBoxConfig: true,
          product: {
            select: {
              isEGiftCard: true,
            },
          },
        },
      },
      reviews: {
        select: {
          productId: true,
          status: true,
        },
      },
      returnRequest: {
        select: {
          id: true,
          status: true,
          adminNote: true,
          images: true,
        },
      },
      purchasedGiftCards: {
        select: {
          id: true,
          code: true,
          initialValue: true,
          balance: true,
          currency: true,
          isActive: true,
          expiresAt: true,
          deliveryStatus: true,
          createdAt: true,
          recipientEmail: true,
          recipientName: true,
          personalMessage: true,
        }
      },
      _count: {
        select: {
          items: true,
          purchasedGiftCards: true,
        },
      },
    },
  });

  const giftCards = await db.giftCard.findMany({
    where: { purchasedByUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      purchasedInOrder: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
        },
      },
    },
  });

  const serializedGiftCards = giftCards.map((gc) => ({
    id: gc.id,
    code: gc.code,
    initialValue: gc.initialValue,
    balance: gc.balance,
    currency: gc.currency,
    isActive: gc.isActive,
    expiresAt: gc.expiresAt?.toISOString() || null,
    deliveryStatus: gc.deliveryStatus,
    createdAt: gc.createdAt.toISOString(),
    recipientEmail: gc.recipientEmail,
    recipientName: gc.recipientName,
    personalMessage: gc.personalMessage,
    order: gc.purchasedInOrder ? {
      id: gc.purchasedInOrder.id,
      orderNumber: gc.purchasedInOrder.orderNumber,
      createdAt: gc.purchasedInOrder.createdAt.toISOString(),
    } : null,
  }));

  const missingImageProductIds = Array.from(
    new Set(
      orders
        .flatMap((order) => order.items)
        .filter((item) => !normalizeImageUrl(item.productImage))
        .map((item) => item.productId)
    )
  );

  const productImageMap = new Map<string, string>();

  if (missingImageProductIds.length > 0) {
    const products = await db.product.findMany({
      where: {
        id: { in: missingImageProductIds },
      },
      select: {
        id: true,
        productImages: true,
      },
    });

    for (const product of products) {
      const imageUrl = normalizeImageUrl(product.productImages);
      if (imageUrl) {
        productImageMap.set(product.id, imageUrl);
      }
    }
  }

  const serializedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    orderType: order.orderType,
    isGift: order.isGift,
    recipientEmail: order.recipientEmail,
    recipientName: order.recipientName,
    total: order.total,
    deliveryFee: order.deliveryFee,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImage: normalizeImageUrl(item.productImage) ?? productImageMap.get(item.productId) ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      salePrice: item.salePrice,
      subtotal: item.subtotal,
      product: item.product,
      parentBoxId: item.parentBoxId,
      isCustomBox: item.isCustomBox,
      customBoxConfig: item.customBoxConfig,
    })),
    reviews: order.reviews.map(r => ({
      productId: r.productId,
      status: r.status,
    })),
    returnRequest: order.returnRequest ? {
      id: order.returnRequest.id,
      status: order.returnRequest.status,
      adminNote: order.returnRequest.adminNote,
      images: order.returnRequest.images as string[],
    } : null,
    purchasedGiftCards: order.purchasedGiftCards.map(gc => ({
      id: gc.id,
      code: gc.code,
      initialValue: gc.initialValue,
      balance: gc.balance,
      currency: gc.currency,
      isActive: gc.isActive,
      expiresAt: gc.expiresAt?.toISOString() || null,
      deliveryStatus: gc.deliveryStatus,
      createdAt: gc.createdAt.toISOString(),
      recipientEmail: gc.recipientEmail,
      recipientName: gc.recipientName,
      personalMessage: gc.personalMessage,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
      }
    })),
    _count: {
      items: order._count.items,
      purchasedGiftCards: order._count.purchasedGiftCards,
    },
  }));

  return (
    <CustomerOrdersClient 
      locale={locale} 
      orders={serializedOrders} 
      giftCards={serializedGiftCards}
    />
  );
}
