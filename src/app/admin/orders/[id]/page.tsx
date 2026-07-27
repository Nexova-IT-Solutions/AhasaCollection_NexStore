import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  FileText,
  Gift,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { formatPriceServer, getCurrencyServer } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OrderManagementPanel } from "../order-management-panel";
import { CustomerInsightsPanel } from "./customer-insights-panel";
import { OrderItemsTable } from "@/components/admin/orders/OrderItemsTable";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminOrderDetailsPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const role = session.user.role as string;
  const hasFullAccess = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(role);

  if (!hasFullAccess) {
    if (!hasPermission(session, "pos.manage_orders")) {
      redirect("/admin");
    }
  }

  const currency = await getCurrencyServer();
  const formatCurr = (amount: number | string) => formatPriceServer(amount, currency);

  const orderData = await db.order.findUnique({
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
      paymentMethod: true,
      trackingNumber: true,
      internalNotes: true,
      isGift: true,
      orderSource: true,
      giftMessage: true,
      senderName: true,
      senderPhone: true,
      recipientName: true,
      recipientPhone: true,
      giftWrapId: true,
      giftWrapName: true,
      giftWrapPrice: true,
      suppressInvoice: true,
      revealSender: true,
      shippingAddress: true,
      shippingProvince: true,
      shippingCity: true,
      requestedDeliveryDate: true,
      items: {
        select: {
          id: true,
          productId: true,
          sku: true,
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
      purchasedGiftCards: {
        select: {
          id: true,
          code: true,
          initialValue: true,
          deliveryStatus: true,
          isActive: true,
        }
      },
      giftCardsIssued: {
        select: {
          id: true,
          code: true,
          initialValue: true,
          deliveryStatus: true,
          isActive: true,
        }
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

  if (!orderData) {
    notFound();
  }

  // Separately query user to avoid Prisma runtime crash "Inconsistent query result: Field user is required"
  // when an order is orphaned because a user record was deleted directly from the database.
  const orderUser = orderData.userId
    ? await db.user.findUnique({
        where: { id: orderData.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      })
    : null;

  const giftWrap = orderData.giftWrapId
    ? await db.giftWrap.findUnique({
        where: { id: orderData.giftWrapId },
        select: { imageUrl: true },
      })
    : null;

  const order = {
    ...orderData,
    user: orderUser,
    giftWrapImage: giftWrap?.imageUrl || null,
  };

  const customerOrderCount = await db.order.count({
    where: { customerEmail: order.customerEmail },
  });

  const address = order.shippingAddress as any;
  const formattedAddress = [
    address?.addressLine1,
    address?.addressLine2,
    address?.city,
    order.shippingProvince || address?.province,
    address?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
  const formatToLKTime = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const hasDigitalGiftCard = order.items.some(
    (item) => 
      item.productName.toLowerCase().includes("gift card") || 
      item.productId === "digital-gift-card" ||
      order.purchasedGiftCards.length > 0
  );

  // Robustly normalize and deduplicate status history so each status appears once with latest timestamp
  const cleanStatusHistory = order.statusHistory || [];

  const filteredStatusHistory = cleanStatusHistory.reduce((acc: typeof cleanStatusHistory, current) => {
    const currentStatusNormalized = String(current.status).trim().toUpperCase();

    const existingIndex = acc.findIndex(
      (item) => String(item.status).trim().toUpperCase() === currentStatusNormalized
    );

    if (existingIndex > -1) {
      if (new Date(current.createdAt) > new Date(acc[existingIndex].createdAt)) {
        acc[existingIndex] = current;
      }
    } else {
      acc.push(current);
    }

    return acc;
  }, [] as typeof cleanStatusHistory);

  // Sort newest-first so timeline shows most recent updates prominently
  const sortedStatusHistory = [...filteredStatusHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 lg:px-10">
        <Link href={`/admin/orders`} className="mb-6 inline-flex items-center gap-2 text-sm text-[#6B5A64] hover:text-[#A7066A]">
          <ArrowLeft className="size-4" />
          Back to Orders
        </Link>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F1720]">Order Details</h1>
            <p className="mt-1 text-sm text-[#6B5A64]">
              Order Number: <span className="font-mono font-semibold text-[#1F1720]">{order.orderNumber}</span>
              {" • "}
              Order Type: <span className="font-semibold text-[#1F1720]">
                {order.orderSource === "BYOB" ? "Custom Gift Box" : order.orderSource === "POS" ? "POS Order" : "Standard Web Order"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order.orderSource === "BYOB" && (
              <Badge className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 border-none font-semibold px-3 py-1 text-xs rounded-full">
                Custom Gift Box
              </Badge>
            )}
            {order.isGift ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                <Gift className="size-3.5" />
                Gift Order
              </span>
            ) : null}
            {order.requestedDeliveryDate ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Clock3 className="size-3.5" />
                Delivery: {new Date(order.requestedDeliveryDate).toISOString().split('T')[0]}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                <Clock3 className="size-3.5" />
                No Delivery Date Requested
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
              <CardHeader className="flex flex-row items-center justify-between gap-3 p-0 mb-1.5 bg-transparent">
                <CardTitle className="text-base font-bold text-[#1F1720]">Financial Breakdown</CardTitle>
                <span className="rounded-full bg-[#FCEAF4] px-3 py-1 text-xs font-semibold text-[#A7066A]">Operational Overview</span>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 p-0 pt-0">
                <StatBox label="Subtotal" value={formatCurr(order.subtotal)} />
                <StatBox label="Discount Savings" value={formatCurr(getDiscountSavings(order.items))} />
                <StatBox label="Delivery Fee" value={order.deliveryFee === 0 ? "FREE" : formatCurr(order.deliveryFee)} />
                <StatBox label="Final Total" value={formatCurr(order.total)} emphasized />
                {order.refundedAmount > 0 && (
                  <StatBox label="Refunded Amount" value={formatCurr(order.refundedAmount)} />
                )}
              </CardContent>
            </Card>

            <OrderItemsTable orderId={order.id} items={order.items as any} />

            {order.isGift ? (
              <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
                <CardHeader className="p-0 mb-1.5 bg-transparent">
                  <CardTitle className="text-base font-bold text-[#1F1720]">Gift Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-0 pt-0">
                  <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Handwritten Note</p>
                    <p className="text-sm italic text-[#6B5A64]">{order.giftMessage || "-"}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock icon={Gift} label="Sender" value={`${order.senderName || "-"} (${order.senderPhone || "-"})`} />
                    <InfoBlock icon={Gift} label="Recipient" value={`${order.recipientName || "-"} (${order.recipientPhone || "-"})`} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-brand-border bg-slate-50 p-4 flex gap-4">
                      {order.giftWrapImage ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-200 border border-slate-200 shrink-0">
                          <Image src={order.giftWrapImage} alt={order.giftWrapName || "Wrapping Paper"} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-200 border border-slate-200 shrink-0 text-xs text-slate-400">
                          <Gift className="size-6 text-[#A7066A]" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#1F1720]">
                          <Gift className="size-4 text-[#A7066A]" />
                          Wrapping
                        </div>
                        <p className="text-sm text-[#6B5A64]">
                          {order.giftWrapName ? `${order.giftWrapName} (${formatCurr(order.giftWrapPrice || 0)})` : "No wrapping selected"}
                        </p>
                      </div>
                    </div>
                    <InfoBlock icon={ReceiptText} label="Invoice Preference" value={order.suppressInvoice ? "Do not include invoice" : "Include invoice"} />
                  </div>

                  <InfoBlock icon={Gift} label="Sender Reveal" value={order.revealSender ? "Visible to recipient" : "Anonymous sender"} />

                  {order.suppressInvoice ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      DO NOT INCLUDE PRICE INVOICE
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {hasDigitalGiftCard && (
              <Card className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden p-5 md:p-6">
                <CardHeader className="bg-transparent p-0 mb-1.5">
                  <CardTitle className="text-base font-bold text-[#1F1720] flex items-center gap-2">
                    <Gift className="size-5 text-[#A7066A]" />
                    Digital Gift Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-0">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="pl-6">Card Code</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      { [...(order.purchasedGiftCards || []), ...(order.giftCardsIssued || [])].length > 0 ? (
                        [...(order.purchasedGiftCards || []), ...(order.giftCardsIssued || [])].map((gc) => (
                          <TableRow key={gc.id}>
                            <TableCell className="pl-6 font-mono text-xs">
                              {gc.code.substring(0, 8)}...{gc.code.substring(gc.code.length - 4)}
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurr(gc.initialValue)}</TableCell>
                            <TableCell>
                              {gc.isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Active</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  "border-none",
                                  gc.deliveryStatus === "SENT" ? "bg-green-100 text-green-700" :
                                  gc.deliveryStatus === "FAILED" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                )}
                              >
                                {gc.deliveryStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              {gc.deliveryStatus !== "SENT" && (
                                <Badge className="cursor-pointer bg-[#A7066A] text-white hover:bg-[#8A0558]">
                                  Retry
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-sm text-[#6B5A64] italic">
                            Gift cards will be generated once payment is approved.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <CustomerInsightsPanel
              customerName={order.user?.name || order.customerName || "Guest Checkout"}
              customerEmail={order.customerEmail}
              customerPhone={order.customerPhone || ""}
              userId={order.userId}
              formattedAddress={formattedAddress}
              customerOrderCount={customerOrderCount}
              customerSince={order.user?.createdAt ? formatToLKTime(order.user.createdAt) : formatToLKTime(order.createdAt)}
              locale={locale}
            />

            <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
              <CardHeader className="p-0 mb-1.5 bg-transparent">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-[#1F1720]">
                  <FileText className="size-4 text-[#A7066A]" />
                  Status Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-0">
                <div className="relative ml-3 border-l-2 border-slate-200 pl-6">
                  <div className="space-y-2.5">
                    {sortedStatusHistory.length > 0 ? (
                      sortedStatusHistory.map((entry) => (
                        <div key={entry.id} className="relative">
                          <span className="absolute -left-[35px] top-0 inline-flex size-5 items-center justify-center rounded-full bg-white">
                            <span className="size-3 rounded-full bg-[#A7066A]" />
                          </span>
                          <div className="space-y-1 pb-1">
                            <p className="text-sm font-semibold text-[#1F1720]">Order marked as {entry.status.replaceAll("_", " ")}</p>
                            <p className="text-xs text-[#6B5A64] break-all whitespace-normal w-full">
                              {formatToLKTime(entry.createdAt)}
                              {entry.changedByName ? ` by ${entry.changedByName}` : ""}
                              {entry.changedByUserId ? ` (${entry.changedByUser?.email || 'System Action'})` : ""}
                            </p>
                            {/* {entry.note &&
                            entry.note !== entry.status &&
                            entry.note !== `Order marked as ${entry.status}` &&
                            entry.note !== `Order marked as ${entry.status.replaceAll("_", " ")}` ? (
                              <p className="text-sm text-[#6B5A64]">{entry.note}</p>
                            ) : null} */}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        No audit log entries yet.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <OrderManagementPanel
              order={{
                id: order.id,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                internalNotes: order.internalNotes,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                userId: order.userId,
                orderNumber: order.orderNumber,
                createdAt: order.createdAt.toISOString(),
                items: order.items.map(i => ({
                  name: i.productName,
                  sku: i.sku || undefined,
                  quantity: i.quantity,
                  price: i.unitPrice,
                  discountPercent: i.discountValue ? Number(i.discountValue) : undefined,
                })),
                total: order.total,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                giftWrapPrice: order.giftWrapPrice,
                giftWrapName: order.giftWrapName,
                trackingNumber: order.trackingNumber,
                suppressInvoice: order.suppressInvoice,
                isGift: order.isGift,
                giftCards: [...(order.purchasedGiftCards || []), ...(order.giftCardsIssued || [])],
                hasDigitalGiftCard: hasDigitalGiftCard,
              }}
              customerOrderCount={customerOrderCount}
              customerProfileUrl={`/admin/users/${order.userId}`}
            />

          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1F1720]">
        <Icon className="size-4 text-[#A7066A]" />
        {label}
      </div>
      <p className="text-sm text-[#6B5A64]">{value}</p>
    </div>
  );
}

function StatBox({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", emphasized ? "border-[#A7066A]/20 bg-[#FCEAF4]" : "border-slate-200 bg-slate-50")}>
      <p className="text-xs uppercase tracking-wide text-[#6B5A64]">{label}</p>
      <p className={cn("mt-2 text-lg font-bold", emphasized ? "text-[#A7066A]" : "text-[#1F1720]")}>{value}</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[#A7066A]" />
        <span className="text-[#6B5A64]">{label}</span>
      </div>
      <span className="max-w-[55%] truncate font-semibold text-[#1F1720]">{value}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function getDiscountSavings(items: Array<{ unitPrice: number; salePrice?: number | null; quantity: number }>) {
  return items.reduce((total, item) => {
    const unitPrice = item.unitPrice || 0;
    const salePrice = item.salePrice ?? unitPrice;
    const savings = Math.max(unitPrice - salePrice, 0) * item.quantity;
    return total + savings;
  }, 0);
}
