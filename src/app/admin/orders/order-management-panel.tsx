"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Printer, Loader2, Save, CheckCircle2, PackageSearch, Download } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { format } from "date-fns";
import { generateReceiptPdf } from "@/lib/pdf-receipt";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { formatOrderStatusLabel, ADMIN_ORDER_STATUS_OPTIONS, ADMIN_PAYMENT_STATUS_OPTIONS } from "@/lib/admin-orders";
import { updateOrderAction, approveAndSendGiftCards } from "./[id]/actions";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type OrderPanelProps = {
  order: {
    id: string;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    internalNotes: string | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    userId: string;
    orderNumber: string;
    createdAt: string;
    items: { name: string; sku?: string; quantity: number; price: number; discountPercent?: number }[];
    total: number;
    subtotal: number;
    deliveryFee: number;
    giftWrapPrice: number | null;
    giftWrapName: string | null;
    trackingNumber: string | null;
    suppressInvoice: boolean;
    isGift: boolean;
    giftCards: Array<{ id: string; deliveryStatus: string; isActive: boolean }>;
    hasDigitalGiftCard: boolean;
  };
  customerOrderCount: number;
  customerProfileUrl: string;
};

export function OrderManagementPanel({ order, customerOrderCount, customerProfileUrl }: OrderPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [internalNotes, setInternalNotes] = React.useState(order.internalNotes ?? "");
  const [draftOrderStatus, setDraftOrderStatus] = React.useState(order.orderStatus);
  const [draftPaymentStatus, setDraftPaymentStatus] = React.useState(order.paymentStatus);
  const [trackingNumber, setTrackingNumber] = React.useState(order.trackingNumber ?? "");
  const [isPending, startTransition] = React.useTransition();
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);

  const { data: toggles } = useSWR<Record<string, boolean>>(
    "/api/admin/feature-toggles",
    fetcher
  );
  const { data: companyDetails } = useSWR("/api/admin/company-details", fetcher);
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;

  const repeatCustomer = customerOrderCount > 1;

  const anyGiftCardSent = order.giftCards.some(gc => gc.deliveryStatus === "SENT");
  const showApproval = order.paymentMethod === "BANK_TRANSFER" && order.hasDigitalGiftCard && !anyGiftCardSent;

  const requiresTrackingNumber = draftOrderStatus === "SHIPPED";

  const handleDownloadReceipt = () => {
    generateReceiptPdf({
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      changeDue: 0, // Admin doesn't track change due
      paymentMethod: order.paymentMethod,
      date: format(new Date(order.createdAt), "PPpp"),
      items: order.items,
      companyDetails: companyDetails,
    }, "download");
  };

  const handlePrintReceipt = () => {
    generateReceiptPdf({
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      changeDue: 0,
      paymentMethod: order.paymentMethod,
      date: format(new Date(order.createdAt), "PPpp"),
      items: order.items,
      companyDetails: companyDetails,
    }, "print");
  };

  const handleSaveStatusChanges = () => {
    if (requiresTrackingNumber && !trackingNumber.trim()) {
      toast({
        title: "Tracking Number Required",
        description: "Please enter the courier tracking number before marking the order as shipped.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateOrderAction(order.id, {
        orderStatus: draftOrderStatus,
        paymentStatus: draftPaymentStatus,
        trackingNumber: trackingNumber.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Order status is now ${formatOrderStatusLabel(draftOrderStatus)}`,
        });
        router.refresh();
      } else {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleApproveGiftCards = async () => {
    startTransition(async () => {
      const result = await approveAndSendGiftCards(order.id);

      if (result.success) {
        setIsCompleted(true);
        toast({
          title: "Gift Cards Activated",
          description: "Gift Cards activated and emailed successfully.",
        });
        router.refresh();
      } else {
        toast({
          title: "Approval Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const result = await updateOrderAction(order.id, { internalNotes });

      if (result.success) {
        toast({ title: "Notes Saved", description: "Internal notes have been updated successfully." });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message || "Could not save internal notes", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {showApproval && !isCompleted && (
        <Card className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="bg-amber-100/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-900">
              <Gift className="size-4" />
              Gift Card Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="mb-4 text-xs font-medium leading-relaxed text-amber-800">
              This order contains digital gift cards purchased via Bank Transfer. They are currently <strong>INACTIVE</strong>.
            </p>
            <Button
              disabled={isPending || order.paymentStatus !== "PAID"}
              onClick={handleApproveGiftCards}
              className="h-11 w-full rounded-xl bg-amber-600 font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Activating & Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve Payment & Send Gift Cards
                </>
              )}
            </Button>
            {order.paymentStatus !== "PAID" && (
              <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-tight text-amber-700">
                Please update the payment status to PAID to unlock this action.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition-all hover:shadow-md p-5 md:p-6">
        <CardHeader className="bg-transparent p-0 mb-1.5">
          <CardTitle className="text-base font-bold text-[#1F1720]">Status Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0 pt-0">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B5A64]">Order Status</label>
            <Select
              disabled={isPending || !isWebsiteEnabled}
              value={draftOrderStatus}
              onValueChange={(value) => setDraftOrderStatus(value)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-brand-border bg-white focus:ring-[#A7066A]/20">
                <SelectValue>
                  <OrderStatusBadge status={draftOrderStatus} type="ORDER" className="border-none bg-transparent p-0" />
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-brand-border">
                {ADMIN_ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B5A64]">Payment Status</label>
            <Select
              disabled={isPending || !isWebsiteEnabled}
              value={draftPaymentStatus}
              onValueChange={(value) => setDraftPaymentStatus(value)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-brand-border bg-white focus:ring-[#A7066A]/20">
                <SelectValue>
                  <OrderStatusBadge status={draftPaymentStatus} type="PAYMENT" className="border-none bg-transparent p-0" />
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-brand-border">
                {ADMIN_PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresTrackingNumber ? (
            <div className="space-y-2 rounded-xl border border-dashed border-[#A7066A]/20 bg-[#FCEAF4]/40 p-4">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B5A64]">
                <PackageSearch className="size-4 text-[#A7066A]" />
                Courier Tracking Number
              </label>
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Enter courier tracking number"
                className="h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm outline-none transition focus:border-[#A7066A] focus:ring-2 focus:ring-[#A7066A]/20"
              />
              <p className="text-[10px] font-medium text-[#6B5A64]">
                Required before saving when the order is marked as shipped.
              </p>
            </div>
          ) : null}

          <div className="pt-1">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-[#A7066A] font-bold text-white hover:bg-[#8A0558]"
              disabled={isPending || !isWebsiteEnabled}
              onClick={handleSaveStatusChanges}
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Status
            </Button>
          </div>

          <div className="pt-2 space-y-2">
            <Button 
              type="button" 
              variant="outline" 
              className="h-11 w-full rounded-xl border-brand-border bg-white font-semibold text-[#1F1720] hover:bg-slate-50 hover:text-[#A7066A]" 
              onClick={handleDownloadReceipt}
            >
              <Download className="mr-2 size-4" />
              Download Receipt
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="h-11 w-full rounded-xl border-brand-border bg-white font-semibold text-[#1F1720] hover:bg-slate-50 hover:text-[#A7066A]" 
              onClick={handlePrintReceipt}
            >
              <Printer className="mr-2 size-4" />
              Print Receipt
            </Button>
          </div>

          {isPending && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 text-xs font-medium text-[#6B5A64]">
              <Loader2 className="size-3.5 animate-spin text-[#A7066A]" />
              Syncing status changes...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
        <CardHeader className="p-0 mb-1.5 bg-transparent">
          <CardTitle className="text-base font-bold text-[#1F1720]">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0 pt-0">
          <Textarea
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            placeholder="Add warehouse or fulfillment notes..."
            className="min-h-[120px] resize-none rounded-xl border-brand-border bg-white p-4 text-sm focus:ring-[#A7066A]/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium text-[#6B5A64]">Visible to staff only</p>
            <Button 
              type="button" 
              onClick={() => void handleSaveNotes()} 
              disabled={savingNotes || internalNotes === order.internalNotes} 
              className="h-9 rounded-lg bg-[#A7066A] px-4 text-xs font-bold text-white hover:bg-[#8A0558] disabled:opacity-50"
            >
              {savingNotes ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Save className="mr-2 size-3.5" />}
              Save Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-brand-border bg-white shadow-sm p-5 md:p-6">
        <CardHeader className="p-0 mb-1.5 bg-transparent">
          <CardTitle className="text-base font-bold text-[#1F1720]">Operational Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0 pt-0 text-sm">
          <SnapshotRow label="Gift Wrap" value={order.giftWrapName || "Standard Packaging"} />
          <SnapshotRow label="Invoice" value={order.suppressInvoice ? "Don't include price" : "Include price"} />
          <div className="mt-2 border-t border-slate-50 pt-2">
            <SnapshotRow label="Revenue" value={formatPrice(order.total)} emphasized />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SnapshotRow({
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
      <span className="text-[#6B5A64]">{label}</span>
      <span className={emphasized ? "font-extrabold text-[#A7066A]" : "font-semibold text-[#1F1720]"}>{value}</span>
    </div>
  );
}

