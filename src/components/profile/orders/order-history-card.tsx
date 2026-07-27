import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Banknote, CreditCard, Star, Eye, Gift, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/profile/orders/order-status-badge";
import { getOrderCategory, type OrderCategoryKey } from "@/lib/orders/categorize-orders";
import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ReturnRequestModal } from "@/components/profile/orders/return-request-modal";
import { resolveStorageUrl } from "@/lib/utils";

/**
 * OrderHistoryCard Component
 * Fixed: Integrated ReturnRequest functionality with proper conditional rendering.
 * Cache-bust: v1.0.1
 */

export interface OrderHistoryCardOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderType?: string;
  total: number;
  deliveryFee: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productImage: string | string[] | null;
    quantity: number;
    parentBoxId?: string | null;
    isCustomBox?: boolean;
    customBoxConfig?: any | null;
    product?: {
      isEGiftCard: boolean;
    } | null;
  }>;
  reviews: Array<{
    productId: string;
    status: string;
  }>;
  returnRequest?: {
    id: string;
    status: string;
    adminNote?: string | null;
    images?: string[];
  } | null;
  isGift: boolean;
  recipientEmail: string | null;
  recipientName: string | null;
  _count: {
    items: number;
    purchasedGiftCards: number;
  };
};

function resolveOrderItemImageSrc(value: string | string[] | null | undefined, productId: string): string | null {
  // If it's a digital gift card, return the brand image
  if (productId === "digital-gift-card" || productId?.startsWith("giftcard-")) {
    return "/images/giftcard-placeholder.png";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return resolveOrderItemImageSrc(JSON.parse(trimmed) as string | string[] | null, productId);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    const parsedImages = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || typeof item !== "object") return null;
        const image = item as { url?: unknown; isMain?: unknown };
        if (typeof image.url !== "string" || !image.url.trim()) return null;
        return {
          url: image.url.trim(),
          isMain: typeof image.isMain === "boolean" ? image.isMain : false,
        };
      })
      .filter(Boolean);

    const mainImage = parsedImages.find((item) => typeof item === "object" && item !== null && "isMain" in item && (item as { isMain: boolean }).isMain);
    if (mainImage && typeof mainImage === "object" && mainImage !== null && "url" in mainImage) {
      return (mainImage as { url: string }).url;
    }

    for (const image of value) {
      const resolved = resolveOrderItemImageSrc(image, productId);
      if (resolved) return resolved;
    }
  }

  return null;
}

type OrderHistoryCardProps = {
  locale: string;
  order: OrderHistoryCardOrder;
  context?: OrderCategoryKey | "all";
};

export function OrderHistoryCard({ locale, order, context = "all" }: OrderHistoryCardProps) {
  const t = useTranslations("ProfileOrders");
  const router = useRouter();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    productId: string;
    productName: string;
    orderId: string;
  } | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingReceived, setIsConfirmingReceived] = useState(false);

  const handleMarkAsReceived = async () => {
    setIsConfirmingReceived(true);
    const toastId = toast.loading("Updating order status...");
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderStatus: "DELIVERED" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order status");
      }

      toast.success("Order marked as received!", { id: toastId });
      router.refresh();
    } catch (error: any) {
      console.error("Failed to mark order as received:", error);
      toast.error(error.message || "Failed to update order. Please try again.", { id: toastId });
    } finally {
      setIsConfirmingReceived(false);
    }
  };

  const paymentMethod = order.paymentMethod?.toUpperCase() || "COD";
  const paymentIcon = paymentMethod === "COD" ? Banknote : CreditCard;
  const PaymentIcon = paymentIcon;
  const orderCategory = context === "all" ? getOrderCategory(order) : context;
  const parentBoxes = order.items.filter(item => item.isCustomBox);
  const childItems = order.items.filter(item => item.parentBoxId);
  const standaloneItems = order.items.filter(item => !item.isCustomBox && !item.parentBoxId);
  const orphanChildren = childItems.filter(child => !parentBoxes.some(parent => parent.id === child.parentBoxId));
  const finalStandalone = [...standaloneItems, ...orphanChildren];

  const groupedItems = [
    ...parentBoxes.map(parent => ({
      parent,
      children: childItems.filter(child => child.parentBoxId === parent.id)
    })),
    ...finalStandalone.map(item => ({
      parent: item,
      children: []
    }))
  ];

  const displayGrouped = isExpanded ? groupedItems : groupedItems.slice(0, 2);
  const hiddenCount = Math.max(groupedItems.length - 2, 0);
  const fallbackImage = "/placeholder-product.png";

  const isPaid = order.paymentStatus === "PAID" || order.paymentStatus === "CONFIRMED";

  return (
    <>
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader className="p-5 pb-0 border-none space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("card.orderNumber")}</p>
                <p className="font-mono text-sm font-bold text-gray-900 tracking-tight">{order.orderNumber}</p>
              </div>
              <p className="text-xs text-gray-500 font-medium">{formatDate(order.createdAt)}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {order.orderType === "CUSTOM_GIFT_BOX" && (
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-none font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Gift className="size-3" />
                  {t("card.customGiftBox")}
                </Badge>
              )}
              <OrderStatusBadge status={order.orderStatus} />
              {order.returnRequest && (
                <ReturnStatusBadge status={order.returnRequest.status} t={t} />
              )}
            </div>
          </div>
 
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50/80 p-3 border border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg border border-gray-100">
                <PaymentIcon className="size-3.5 text-gray-600" />
              </div>
              <p className="text-xs font-semibold text-gray-700">{formatPaymentMethod(t, paymentMethod)}</p>
            </div>
            <div className="hidden sm:block h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("card.status")}</p>
              <OrderStatusBadge type="PAYMENT" status={order.paymentStatus} className="text-[10px] px-2 py-0" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className={`space-y-3 transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200" : ""}`}>
            {displayGrouped.map((group) => {
              if (group.parent.isCustomBox) {
                return (
                  <div key={group.parent.id} className="rounded-xl border border-purple-100 bg-purple-50/10 p-3 space-y-3 shadow-sm">
                    {/* Parent custom box card */}
                    <div className="flex items-center gap-4 group/parent animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                        <img
                          src={resolveOrderItemImageSrc(group.parent.productImage, group.parent.productId) || fallbackImage}
                          alt={group.parent.productName}
                          className="h-full w-full object-cover transition-transform group-hover/parent:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute -bottom-px -right-px bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-md">
                          x{group.parent.quantity}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-gray-800 leading-none">{group.parent.productName}</p>
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-black text-[9px] px-1.5 py-0 rounded border-none">
                            Custom Box
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Child items container with tree-like connections */}
                    <div className="ml-6 pl-4 border-l-2 border-dashed border-purple-200 space-y-3">
                      {group.children.map((child: any) => (
                        <div key={child.id} className="relative flex items-center gap-3 group/child animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* Horizontal connector line indicator */}
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-px bg-dashed border-t border-purple-200" />
                          
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gray-50 border border-gray-100 shadow-sm">
                            <img
                              src={resolveOrderItemImageSrc(child.productImage, child.productId) || fallbackImage}
                              alt={child.productName}
                              className="h-full w-full object-cover transition-transform group-hover/child:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute -bottom-px -right-px bg-gray-900/90 text-white text-[8px] font-black px-1 py-0.2 rounded-tl-md">
                              x{child.quantity}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs font-semibold text-gray-700 leading-none">{child.productName}</p>
                              <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-1 py-px rounded border border-purple-100/55 uppercase tracking-wide">
                                {t("card.boxItem")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const review = order.reviews.find(r => r.productId === child.productId);
                                if (review?.status === "PENDING") {
                                  return <Badge variant="outline" className="text-[9px] font-bold text-amber-600 bg-amber-50 border-amber-100 px-1.5 py-0">{t("card.reviewPending")}</Badge>;
                                }
                                if (review?.status === "APPROVED") {
                                  return <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100 px-1.5 py-0">{t("card.reviewApproved")}</Badge>;
                                }
                                if (review?.status === "REJECTED") {
                                  return <Badge variant="outline" className="text-[9px] font-bold text-rose-600 bg-rose-50 border-rose-100 px-1.5 py-0">{t("card.reviewRejected")}</Badge>;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          {orderCategory === "toReview" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={order.reviews.some(r => r.productId === child.productId && r.status !== "REJECTED")}
                              className="h-7 text-[10px] font-bold text-[#A7066A] hover:bg-[#FCEAF4] hover:text-[#A7066A] rounded-lg shrink-0 px-2"
                              onClick={() => {
                                setSelectedProduct({
                                  productId: child.productId,
                                  productName: child.productName,
                                  orderId: order.id,
                                });
                                setReviewModalOpen(true);
                              }}
                            >
                              <Star className={`mr-1 size-2.5 ${order.reviews.some(r => r.productId === child.productId && r.status !== "REJECTED") ? "fill-gray-400 text-gray-400" : ""}`} />
                              {order.reviews.some(r => r.productId === child.productId && r.status !== "REJECTED") ? t("card.allReviewed") : t("card.review")}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={group.parent.id} className="flex items-center gap-4 group animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                    <img
                      src={resolveOrderItemImageSrc(group.parent.productImage, group.parent.productId) || fallbackImage}
                      alt={group.parent.productName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute -bottom-px -right-px bg-gray-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-md">
                      x{group.parent.quantity}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-bold text-gray-800 leading-none">{group.parent.productName}</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const review = order.reviews.find(r => r.productId === group.parent.productId);
                        if (review?.status === "PENDING") {
                          return <Badge variant="outline" className="text-[9px] font-bold text-amber-600 bg-amber-50 border-amber-100 px-1.5 py-0">{t("card.reviewPending")}</Badge>;
                        }
                        if (review?.status === "APPROVED") {
                          return <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100 px-1.5 py-0">{t("card.reviewApproved")}</Badge>;
                        }
                        if (review?.status === "REJECTED") {
                          return <Badge variant="outline" className="text-[9px] font-bold text-rose-600 bg-rose-50 border-rose-100 px-1.5 py-0">{t("card.reviewRejected")}</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  {orderCategory === "toReview" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={order.reviews.some(r => r.productId === group.parent.productId && r.status !== "REJECTED")}
                      className="h-8 text-xs font-bold text-[#A7066A] hover:bg-[#FCEAF4] hover:text-[#A7066A] rounded-lg shrink-0"
                      onClick={() => {
                        setSelectedProduct({
                          productId: group.parent.productId,
                          productName: group.parent.productName,
                          orderId: order.id,
                        });
                        setReviewModalOpen(true);
                      }}
                    >
                      <Star className={`mr-1 size-3 ${order.reviews.some(r => r.productId === group.parent.productId && r.status !== "REJECTED") ? "fill-gray-400 text-gray-400" : ""}`} />
                      {order.reviews.some(r => r.productId === group.parent.productId && r.status !== "REJECTED") ? t("card.allReviewed") : t("card.review")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="h-px flex-1 bg-gray-50" />
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#A7066A] bg-[#FCEAF4] px-3 py-1 rounded-full hover:bg-[#A7066A] hover:text-white transition-all active:scale-95 shadow-sm"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="size-3" />
                    {t("card.showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    {t("card.moreItems", { count: hiddenCount })}
                  </>
                )}
              </button>
              <span className="h-px flex-1 bg-gray-50" />
            </div>
          )}

          {order.returnRequest?.status === "REJECTED" && order.returnRequest.adminNote && (
            <div className="mt-2 rounded-2xl bg-rose-50/50 p-4 border border-rose-100">
              <div className="flex items-center gap-2 mb-1.5">
                <RefreshCcw className="size-3 text-rose-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">{t("card.rejectionFeedback")}</p>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-medium italic">"{order.returnRequest.adminNote}"</p>
            </div>
          )}

          {/* Return evidence images – shown to the customer on their submitted request */}
          {order.returnRequest && order.returnRequest.images && order.returnRequest.images.length > 0 && (
            <div className="mt-3 rounded-2xl bg-gray-50/80 p-3 border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t("card.yourReturnPhotos")}</p>
              <div className="grid grid-cols-4 gap-2">
                {order.returnRequest.images.map((img: string, idx: number) => (
                  <a
                    key={idx}
                    href={resolveStorageUrl(img)}
                    target="_blank"
                    rel="noreferrer"
                    className="relative w-16 h-16 border rounded-lg bg-muted overflow-hidden block hover:opacity-80 transition"
                  >
                    <img
                      src={resolveStorageUrl(img)}
                      alt={`Return evidence ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="object-cover w-full h-full"
                      onError={(e) => { e.currentTarget.src = "/placeholder-product.png"; }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-5 bg-gray-50/30">
          <div className="flex items-baseline gap-2 w-full sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("card.total")}</p>
            <p className="text-xl font-black text-[#A7066A] tabular-nums leading-none">
              {formatCurrency(order.total)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {renderActions(
              t,
              orderCategory,
              locale,
              order,
              () => {
                const unreviewedItem = order.items.find(item => !order.reviews.some(r => r.productId === item.productId && r.status !== "REJECTED"));
                if (unreviewedItem) {
                  setSelectedProduct({
                    productId: unreviewedItem.productId,
                    productName: unreviewedItem.productName,
                    orderId: order.id,
                  });
                  setReviewModalOpen(true);
                }
              },
              order.items.every(item => order.reviews.some(r => r.productId === item.productId && r.status !== "REJECTED")),
              order.orderStatus === "DELIVERED",
              !!order.returnRequest,
              () => setReturnModalOpen(true),
              handleMarkAsReceived,
              isConfirmingReceived
            )}
          </div>
        </CardFooter>
      </Card>

      {reviewModalOpen && selectedProduct && (
        <WriteReviewModal
          productId={selectedProduct.productId}
          productName={selectedProduct.productName}
          orderId={selectedProduct.orderId}
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            // refresh page or show success
          }}
        />
      )}

      <ReturnRequestModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
      />
    </>
  );
}

function renderActions(
  t: (key: string, values?: any) => string,
  category: OrderCategoryKey,
  locale: string,
  order: OrderHistoryCardOrder,
  onReviewClick: () => void,
  isAllReviewed: boolean,
  isDelivered: boolean,
  hasReturnRequest: boolean,
  onReturnRequestClick: () => void,
  onReceivedClick: () => void,
  isConfirmingReceived: boolean
) {
  const viewOrderAction = (
    <Button asChild className="bg-[#A7066A] hover:bg-[#8A0558] font-bold rounded-xl shadow-lg shadow-[#A7066A]/10 px-6 max-md:w-full">
      <Link href={`/profile/orders/${order.id}`}>{t("card.viewOrder")}</Link>
    </Button>
  );

  if (category === "toPay") {
    return (
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button asChild variant="outline" className="border-gray-300 rounded-xl max-md:order-2 max-md:w-full">
          <Link href={`/profile/orders/${order.id}`}>{t("card.details")}</Link>
        </Button>
        <Button asChild className="bg-[#A7066A] hover:bg-[#8A0558] font-bold rounded-xl max-md:order-1 max-md:w-full">
          <Link href={`/checkout/${order.id}/pay`}>{t("card.payNow")}</Link>
        </Button>
      </div>
    );
  }

  if (category === "toShip") {
    return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {viewOrderAction}
        <Button variant="outline" className="border-gray-200 text-gray-400 text-xs rounded-xl max-md:w-full">
          {t("card.cancel")}
        </Button>
      </div>
    );
  }

  

  if (category === "toReview") {
    return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {viewOrderAction}
        {isDelivered && (
          <Button 
            variant="outline" 
            className="border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl disabled:opacity-70 max-md:w-full"
            onClick={onReturnRequestClick}
            disabled={hasReturnRequest}
          >
            <RefreshCcw className="mr-1.5 size-4" />
            {hasReturnRequest ? t("card.returnRequested") : t("card.return")}
          </Button>
        )}
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl disabled:bg-gray-100 disabled:text-gray-400 max-md:w-full"
          onClick={onReviewClick}
          disabled={isAllReviewed}
        >
          <Star className={`mr-1.5 size-4 ${isAllReviewed ? "fill-gray-400 text-gray-400" : "fill-white"}`} />
          {isAllReviewed ? t("card.allReviewed") : t("card.review")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {viewOrderAction}
      {isDelivered && (
        <Button 
          variant="outline" 
          className="border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl disabled:opacity-70 max-md:w-full"
          onClick={onReturnRequestClick}
          disabled={hasReturnRequest}
        >
          <RefreshCcw className="mr-1.5 size-4" />
          {hasReturnRequest ? t("card.returnRequested") : t("card.returnItems")}
        </Button>
      )}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPaymentMethod(t: (key: string) => string, value: string) {
  if (value === "COD") return t("card.cod");
  if (value === "DIRECTPAY") return t("card.directpay");
  if (value === "MINTPAY") return t("card.mintpay");
  return value;
}

function ReturnStatusBadge({ status, t }: { status: string; t: (key: string, values?: any) => string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    REFUNDED: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <Badge 
      variant="outline" 
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight shadow-none ${styles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {t("card.returnStatus", { status })}
    </Badge>
  );
}
