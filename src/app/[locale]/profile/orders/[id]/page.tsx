import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Gift, ReceiptText, WalletCards } from "lucide-react";
import { getCurrencyServer, formatPriceServer } from "@/lib/currency";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/profile/orders/order-status-badge";
import { OrderTrackingTimeline } from "@/components/profile/orders/order-tracking-timeline";
import { TrackingNumberCard } from "@/components/profile/orders/tracking-number-card";

import { OrderDetailActions } from "@/components/profile/orders/order-detail-actions";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProfileOrderDetailsPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);
  const currency = await getCurrencyServer();
  const formatCurrency = (amount: number) => formatPriceServer(amount, currency);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  const order = await db.order.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      orderStatus: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      deliveryFee: true,
      total: true,
      orderType: true,
      shippingAddress: true,
      shippingProvince: true,
      shippingCity: true,
      giftWrapId: true,
      giftWrapPrice: true,
      giftWrapName: true,
      isGift: true,
      customerName: true,
      customerPhone: true,
      recipientName: true,
      recipientPhone: true,
      senderName: true,
      senderPhone: true,
      giftMessage: true,
      suppressInvoice: true,
      revealSender: true,
      trackingNumber: true,
      items: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          purchasedGiftCards: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const hasGiftCards = order._count.purchasedGiftCards > 0 || order.items.some(i => i.productId === "digital-gift-card" || i.productId?.startsWith("giftcard-"));
  const isPaid = order.paymentStatus === "PAID" || (order.paymentStatus as string) === "CONFIRMED";

  const giftWrap = order.giftWrapId
    ? await db.giftWrap.findUnique({
        where: { id: order.giftWrapId },
        select: { imageUrl: true },
      })
    : null;

  const shippingAddress = (order.shippingAddress ?? {}) as {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    contactName?: string;
    phoneNumber?: string;
  };

  const timelineEntries =
    order.statusHistory.length > 0
      ? order.statusHistory.map((entry) => ({
          id: entry.id,
          status: entry.status,
          note: entry.note,
          createdAt: entry.createdAt,
        }))
      : [
          {
            id: `fallback-${order.id}`,
            status: order.orderStatus,
            note: "Order placed",
            createdAt: order.createdAt,
          },
        ];

  const parentBoxes = order.items.filter(item => (item as any).isCustomBox);
  const childItems = order.items.filter(item => (item as any).parentBoxId);
  const standaloneItems = order.items.filter(item => !(item as any).isCustomBox && !(item as any).parentBoxId);
  const orphanChildren = childItems.filter(child => !parentBoxes.some(parent => parent.id === (child as any).parentBoxId));
  const finalStandalone = [...standaloneItems, ...orphanChildren];

  const groupedItems = [
    ...parentBoxes.map(parent => ({
      parent,
      children: childItems.filter(child => (child as any).parentBoxId === parent.id)
    })),
    ...finalStandalone.map(item => ({
      parent: item,
      children: []
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/${locale}/profile/orders`} className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#A7066A]">
            <ArrowLeft className="size-4" />
            Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <OrderDetailActions 
              orderId={order.id} 
              orderNumber={order.orderNumber} 
              hasGiftCards={hasGiftCards} 
              isPaid={isPaid} 
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-[#A7066A]">{formatCurrency(order.total)}</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <OrderStatusBadge status={order.orderStatus} />
            <OrderStatusBadge type="PAYMENT" status={order.paymentStatus} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {order.trackingNumber ? (
            <TrackingNumberCard trackingNumber={order.trackingNumber} locale={locale} />
          ) : null}

          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Order Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTrackingTimeline
                statusHistory={timelineEntries}
                currentStatus={order.orderStatus}
                orderCreatedAt={order.createdAt}
                trackingNumber={order.trackingNumber}
              />
            </CardContent>
          </Card>

          {order.orderType === "CUSTOM_GIFT_BOX" && (
            <Card className="rounded-2xl border-2 border-purple-200 bg-purple-50/20 shadow-sm overflow-hidden">
              <CardHeader className="bg-purple-100/50 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-purple-900">
                  <Gift className="size-5 text-purple-600 animate-pulse" />
                  Custom Gift Box Order details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <p className="text-gray-600 font-medium">
                  This order contains a Custom Build-Your-Own-Box (BYOB) gift box, tailored to your selection.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 pt-2">
                  {giftWrap?.imageUrl && (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-purple-200 bg-white shadow-sm">
                      <Image 
                        src={giftWrap.imageUrl} 
                        alt={order.giftWrapName || "Wrapping Paper"} 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-purple-500 font-bold">Wrapping Style</p>
                      <p className="font-bold text-base text-gray-800">{order.giftWrapName || "Standard Gift Box Wrap"}</p>
                    </div>
                    {order.giftMessage && (
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-purple-500 font-bold">Gift Message</p>
                        <p className="bg-white border border-purple-100 rounded-xl p-3 text-gray-700 italic font-medium">
                          "{order.giftMessage}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-gray-900">Items</CardTitle>
              {order.orderType === "CUSTOM_GIFT_BOX" && (
                <Badge className="bg-purple-100 text-purple-700 border-none font-bold text-xs">Custom Gift Box Selection</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedItems.map((group) => {
                if (group.parent.isCustomBox) {
                  return (
                    <div key={group.parent.id} className="rounded-xl border border-purple-100 bg-purple-50/10 p-4 space-y-3 shadow-sm">
                      {/* Parent custom box card */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {group.parent.productImage ? (
                            <Image src={group.parent.productImage} alt={group.parent.productName} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-1 text-sm font-bold text-gray-900">{group.parent.productName}</p>
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-black text-[9px] px-1.5 py-0 rounded border-none">
                              Custom Box
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">Qty: {group.parent.quantity}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(group.parent.subtotal)}</p>
                        </div>
                      </div>

                      {/* Child items container with tree-like connections */}
                      <div className="ml-8 pl-4 border-l-2 border-dashed border-purple-200 space-y-3">
                        {group.children.map((child: any) => (
                          <div key={child.id} className="relative flex items-center gap-3 group/child animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Horizontal connector line indicator */}
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-px bg-dashed border-t border-purple-200" />
                            
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-150">
                              {child.productImage ? (
                                <Image src={child.productImage} alt={child.productName} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold text-gray-700 leading-none">{child.productName}</p>
                                <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-1 py-px rounded border border-purple-100/55 uppercase tracking-wide">
                                  Box Item
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">Qty: {child.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400">Subtotal</p>
                              <p className="text-xs font-semibold text-gray-600">{formatCurrency(child.subtotal)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={group.parent.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                      {group.parent.productId === "digital-gift-card" ? (
                        <Image src="/images/giftcard-placeholder.png" alt={group.parent.productName} fill className="object-cover" />
                      ) : group.parent.productImage ? (
                        <Image src={group.parent.productImage} alt={group.parent.productName} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-gray-900">{group.parent.productName}</p>
                      <p className="text-xs text-gray-500">Qty: {group.parent.quantity}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(group.parent.subtotal)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <WalletCards className="size-4 text-[#A7066A]" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Payment Method" value={formatPaymentMethod(order.paymentMethod)} />
              <SummaryRow label="Payment Status" value={order.paymentStatus.replaceAll("_", " ")} />
              <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
              <SummaryRow label="Delivery" value={order.deliveryFee === 0 ? "FREE" : formatCurrency(order.deliveryFee)} />
              <SummaryRow label="Gift Wrapping" value={order.giftWrapPrice && order.giftWrapPrice > 0 ? formatCurrency(order.giftWrapPrice) : "Not selected"} />
              <div className="border-t border-gray-100 pt-3">
                <SummaryRow label="Total" value={formatCurrency(order.total)} emphasized />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <ReceiptText className="size-4 text-[#A7066A]" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              {order.isGift ? (
                <Badge className="inline-flex items-center gap-1 rounded-full bg-pink-100 text-pink-700 hover:bg-pink-100">
                  <Gift className="size-3.5" />
                  Gift Order
                </Badge>
              ) : null}

              <InfoRow label="Recipient" value={order.recipientName || shippingAddress.contactName || order.customerName} />
              <InfoRow label="Phone" value={order.recipientPhone || shippingAddress.phoneNumber || order.customerPhone} />
              <InfoRow
                label="Address"
                value={[
                  shippingAddress.addressLine1,
                  shippingAddress.addressLine2,
                  order.shippingCity || shippingAddress.city,
                  order.shippingProvince || shippingAddress.province,
                  shippingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              />

              {order.isGift ? (
                <>
                  <InfoRow label="Sender" value={order.senderName || "-"} />
                  <InfoRow label="Sender Phone" value={order.senderPhone || "-"} />
                  <InfoRow label="Gift Wrapping" value={order.giftWrapName || "Not selected"} />
                  {order.giftMessage ? (
                    <div className="rounded-xl border border-gray-100 bg-pink-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Gift Message</p>
                      <p className="mt-1 text-sm text-gray-700">{order.giftMessage}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPaymentMethod(value: string) {
  if (value === "COD") return "Cash on Delivery";
  if (value === "DIRECTPAY") return "DirectPay";
  if (value === "MINTPAY") return "MintPay";
  return value;
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={emphasized ? "text-base font-bold text-[#A7066A]" : "font-medium text-gray-900"}>{value}</span>
    </div>
  );
}
