"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Banknote, CreditCard, Gift, Split, Loader2, CheckCircle2,
  Calculator, Receipt, ArrowRight, Plus, Trash2, Sparkles, ScanLine, Printer, Download, Smartphone, FileText,
} from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { usePosCart } from "@/store/use-pos-cart";
import type { SplitPaymentEntry, PosPaymentMethod, GiftCardActivation } from "@/types/pos";
import { toast } from "sonner";
import useSWR from "swr";
import { generateReceiptPdf } from "@/lib/pdf-receipt";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const QUICK_CASH_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000];

export function CheckoutModal() {
  const isOpen = usePosCart((s) => s.isCheckoutOpen);
  const items = usePosCart((s) => s.items);
  const customer = usePosCart((s) => s.customer);
  const activeShift = usePosCart((s) => s.activeShift);
  const payment = usePosCart((s) => s.payment);
  const notes = usePosCart((s) => s.notes);
  const isProcessing = usePosCart((s) => s.isProcessing);

  const closeCheckout = usePosCart((s) => s.closeCheckout);
  const setPaymentMethod = usePosCart((s) => s.setPaymentMethod);
  const setCashTendered = usePosCart((s) => s.setCashTendered);
  const setCardReference = usePosCart((s) => s.setCardReference);
  const setGiftCardCode = usePosCart((s) => s.setGiftCardCode);
  const setGiftCardDeduction = usePosCart((s) => s.setGiftCardDeduction);
  const setSplitPayments = usePosCart((s) => s.setSplitPayments);
  const setProcessing = usePosCart((s) => s.setProcessing);
  const setLastOrderNumber = usePosCart((s) => s.setLastOrderNumber);
  const clearCart = usePosCart((s) => s.clearCart);
  const getSubtotal = usePosCart((s) => s.getSubtotal);
  const getTotal = usePosCart((s) => s.getTotal);
  const fetchActiveShift = usePosCart((s) => s.fetchActiveShift);

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isGiftcardsEnabled = toggles?.storefront_giftcards !== false;
  const isSplitEnabled = toggles?.operations_split_payment !== false;
  const { data: companyDetails } = useSWR("/api/admin/company-details", fetcher);

  const [isValidatingGiftCard, setIsValidatingGiftCard] = useState(false);
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardIsPhysical, setGiftCardIsPhysical] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitPaymentEntry[]>([]);
  const [successOrder, setSuccessOrder] = useState<{
    orderNumber: string; total: number; subtotal: number; changeDue: number;
    paymentMethod: string;
    items: { name: string; quantity: number; price: number; discountPercent?: number }[];
    activatedCodes?: string[];
  } | null>(null);

  const subtotal = getSubtotal();
  const total = getTotal();
  const changeDue = payment.method === "POS_CASH"
    ? Math.max(0, payment.cashTendered - total) : 0;

  const arNum = (n: number | string) => {
    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(n).replace(/[0-9]/g, (w) => arabicNumbers[+w]);
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessOrder(null);
      setGiftCardBalance(null);
      setGiftCardError(null);
      setGiftCardIsPhysical(false);
      setSplitEntries([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const { formatPrice } = useCurrency();

  // ─── Gift Card Reason → Human Message ───────────────────────────────
  const reasonToMessage = (reason: string | undefined): string => {
    switch (reason) {
      case "NOT_FOUND":    return "Gift card not found. Check the code and try again.";
      case "NOT_PHYSICAL": return "This is a digital gift card — it cannot be used at the POS terminal.";
      case "INACTIVE":     return "This gift card has been deactivated.";
      case "EXPIRED":      return "This gift card has expired.";
      case "ZERO_BALANCE": return "This gift card has no remaining balance.";
      case "HELD":         return "This card is reserved by another transaction. Try again in a moment.";
      case "ALREADY_USED": return "This gift card has already been fully redeemed.";
      default:             return "Gift card validation failed. Please try again.";
    }
  };

  // ─── Gift Card Validation ────────────────────────────────────────────
  const validateGiftCard = async () => {
    if (!payment.giftCardCode.trim()) return;
    setIsValidatingGiftCard(true);
    setGiftCardError(null);
    setGiftCardBalance(null);
    try {
      const res = await fetch(`/api/admin/pos/gift-cards/verify?code=${encodeURIComponent(payment.giftCardCode.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setGiftCardError(reasonToMessage(data.reason));
        return;
      }

      setGiftCardBalance(data.balance);
      setGiftCardIsPhysical(data.isPhysical ?? false);
      setGiftCardDeduction(Math.min(data.balance, total));
    } catch {
      setGiftCardError("Failed to verify gift card. Check your connection and try again.");
    } finally {
      setIsValidatingGiftCard(false);
    }
  };

  // ─── Split Payment Helpers ───────────────────────────────
  const splitTotal = useMemo(() =>
    splitEntries.reduce((sum, e) => sum + e.amount, 0), [splitEntries]);
  const splitRemaining = total - splitTotal;

  const addSplitEntry = () => {
    setSplitEntries([...splitEntries, { method: "POS_CASH", amount: 0, reference: "" }]);
  };
  const updateSplitEntry = (index: number, field: keyof SplitPaymentEntry, value: any) => {
    const updated = [...splitEntries];
    updated[index] = { ...updated[index], [field]: value };
    setSplitEntries(updated);
  };
  const removeSplitEntry = (index: number) => {
    setSplitEntries(splitEntries.filter((_, i) => i !== index));
  };
  const fillRemainingToEntry = (index: number) => {
    if (splitRemaining > 0) {
      updateSplitEntry(index, "amount", splitEntries[index].amount + splitRemaining);
    }
  };

  // ─── Split: Cash Change Calculator ──────────────────────
  const splitCashTotal = useMemo(() =>
    splitEntries.filter((e) => e.method === "POS_CASH").reduce((sum, e) => sum + e.amount, 0),
    [splitEntries]
  );



  // ─── Process Payment ────────────────────────────────────
  const handlePayment = async () => {
    if (!activeShift) { toast.error("No active shift"); return; }
    if (items.length === 0) { toast.error("Cart is empty"); return; }

    if (payment.method === "POS_CASH" && payment.cashTendered < total) {
      toast.error("Cash tendered is less than the total"); return;
    }
    if (payment.method === "POS_SPLIT" && Math.abs(splitRemaining) > 0.01) {
      toast.error(`Split payments don't add up. Remaining: ${formatPrice(splitRemaining)}`); return;
    }


    setProcessing(true);
    try {
      const payload = {
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.name,
          productNameAr: item.nameAr || null,
          quantity: item.quantity,
          unitPrice: item.price,
          salePrice: item.effectivePrice !== item.price ? item.effectivePrice : null,
          discountName: item.discountName || (item.discountPercent > 0 ? `${item.discountPercent}% off` : null),
          discountValue: item.discountValue || (item.discountPercent > 0 ? item.discountPercent : null),
          isGiftCard: item.isGiftCard,
          giftCardCode: item.giftCardCode,
          isPhysical: item.isPhysical,
          recipientEmail: item.recipientEmail,
          personalMessage: item.personalMessage,
        })),
        subtotal, total,
        paymentMethod: payment.method,
        cashTendered: payment.method === "POS_CASH" ? payment.cashTendered : 0,
        changeDue: payment.method === "POS_CASH" ? changeDue : 0,
        cardReference: (payment.method === "POS_CARD" || payment.method === "CREDIT_CARD" || payment.method === "DEBIT_CARD") ? payment.cardReference : "",
        giftCardCode: (payment.method === "POS_GIFT_CARD" || payment.giftCardDeduction > 0)
          ? payment.giftCardCode : "",
        giftCardDeduction: payment.giftCardDeduction,
        splitPayments: payment.method === "POS_SPLIT" ? splitEntries : [],
        shiftId: activeShift.id,
        customerId: customer?.id || null,
        customerName: customer?.name || "Walk-in Customer",
        customerPhone: customer?.phone || "",
        notes,
      };

      const res = await fetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("[POS Checkout] API Error:", res.status, data);
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: string) => toast.error(err));
        } else { toast.error(data.message || `Checkout failed (${res.status})`); }
        return;
      }

      setSuccessOrder({
        orderNumber: data.order.orderNumber,
        total: data.order.total,
        subtotal,
        changeDue,
        paymentMethod: payment.method,
        items: items.map(i => ({ name: i.name, nameAr: i.nameAr || null, sku: i.sku, quantity: i.quantity, price: i.price, discountPercent: i.discountPercent })),
        activatedCodes: data.order.activatedCodes ?? [],
      });
      setLastOrderNumber(data.order.orderNumber);
      // Clear the cart so the success screen renders cleanly
      clearCart();
      toast.success(`Order ${data.order.orderNumber} completed!`);
      fetchActiveShift();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Payment processing failed. Please try again.");
    } finally { setProcessing(false); }
  };

  const handleNewSale = () => { clearCart(); setSuccessOrder(null); closeCheckout(); };

  const handleDownloadReceipt = () => {
    if (!successOrder) return;
    
    generateReceiptPdf({
      orderNumber: successOrder.orderNumber,
      total: successOrder.total,
      subtotal: successOrder.subtotal,
      changeDue: successOrder.changeDue,
      paymentMethod: successOrder.paymentMethod,
      date: format(new Date(), "PPpp"),
      items: successOrder.items,
      companyDetails: companyDetails,
    }, "download");
  };

  const handlePrintReceipt = () => {
    if (!successOrder) return;
    generateReceiptPdf({
      orderNumber: successOrder.orderNumber,
      total: successOrder.total,
      subtotal: successOrder.subtotal,
      changeDue: successOrder.changeDue,
      paymentMethod: successOrder.paymentMethod,
      date: format(new Date(), "PPpp"),
      items: successOrder.items,
      companyDetails: companyDetails,
    }, "print");
  };

  const paymentMethods: { method: PosPaymentMethod; label: string; icon: any }[] = [
    { method: "POS_CASH", label: "Cash", icon: Banknote },
    { method: "POS_CARD", label: "Card", icon: CreditCard },
    { method: "POS_MOBILE_TRANSFER", label: "Mobile transfer", icon: Smartphone },
    { method: "POS_CREDIT", label: "Credit", icon: FileText },
    ...(isGiftcardsEnabled ? [{ method: "POS_GIFT_CARD", label: "Gift Card", icon: Gift }] : []),
    ...(isSplitEnabled ? [{ method: "POS_SPLIT", label: "Split", icon: Split }] : []),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCheckout()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ─── SUCCESS STATE ──────────────────────────── */}
        {successOrder ? (
          <div className="flex flex-col items-center py-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
              <div className="relative bg-emerald-100 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Payment Complete!</h2>
              <p className="text-sm text-slate-500">
                Order <span className="font-mono font-bold text-[#A7066A]">{successOrder.orderNumber}</span>
              </p>
            </div>
            <div className="w-full max-w-xs space-y-2 bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex flex-col gap-0.5"><span>Total Paid</span><span className="text-[10px] dir-rtl">إجمالي المدفوع</span></span>
                <span className="font-bold text-slate-800 flex flex-col items-end">
                  <span>{formatPrice(successOrder.total)}</span>
                  <span className="text-xs text-slate-500">{arNum(formatPrice(successOrder.total))}</span>
                </span>
              </div>
              {successOrder.changeDue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex flex-col gap-0.5"><span>Change Due</span><span className="text-[10px] dir-rtl">الباقي</span></span>
                  <span className="font-bold text-emerald-600 text-lg">
                    {formatPrice(successOrder.changeDue)}
                  </span>
                </div>
              )}
              {/* Activated gift cards summary */}
              {successOrder.activatedCodes && successOrder.activatedCodes.length > 0 && (
                <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Activated Gift Cards</p>
                  {successOrder.activatedCodes.map((code) => (
                    <div key={code} className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-mono text-slate-700">{code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex w-full max-w-xs gap-3">
              <Button onClick={handleDownloadReceipt}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold shadow-sm border border-slate-200">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button onClick={handlePrintReceipt}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold shadow-sm border border-slate-200">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
            
            <Button onClick={handleNewSale}
              className="w-full max-w-xs h-12 bg-[#A7066A] hover:bg-[#8A0558] text-white text-sm font-semibold shadow-lg">
              <Receipt className="h-4 w-4 mr-2" /> New Sale
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="bg-[#A7066A]/10 p-2 rounded-lg">
                  <Calculator className="h-5 w-5 text-[#A7066A]" />
                </div>
                Process Payment
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-1.5">
                  Total: <span className="font-bold text-[#A7066A]">{formatPrice(total)}</span>
                  <span className="font-bold text-[#A7066A] text-xs">({arNum(formatPrice(total))})</span>
                  <span className="text-slate-400">·</span>
                  <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">



              {/* Payment Method Tabs */}
              <div className="grid gap-1.5 bg-slate-100 p-1 rounded-xl" style={{ gridTemplateColumns: `repeat(${paymentMethods.length}, minmax(0, 1fr))` }}>
                {paymentMethods.map(({ method, label, icon: Icon }) => (
                  <button key={method} onClick={() => {
                    setPaymentMethod(method);
                  }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      payment.method === method
                        ? "bg-white text-[#A7066A] shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>

              {/* ─── CASH PAYMENT ──────────────────── */}
              {payment.method === "POS_CASH" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">Cash Tendered</Label>
                    <Input type="number" min={0} step={0.01}
                      value={payment.cashTendered || ""}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="h-14 text-2xl font-bold text-center" placeholder="0.00" autoFocus />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_CASH_AMOUNTS.map((amount) => (
                      <button key={amount} onClick={() => setCashTendered(amount)}
                        className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          payment.cashTendered === amount
                            ? "bg-[#A7066A] text-white border-[#A7066A]"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#A7066A] hover:text-[#A7066A]"
                        }`}>
                        {formatPrice(amount)}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setCashTendered(total)} className="w-full h-10 text-xs">
                    Exact Amount: {formatPrice(total)}
                  </Button>
                  {payment.cashTendered > 0 && (
                    <div className={`rounded-xl p-4 text-center ${
                      changeDue > 0 ? "bg-emerald-50 border border-emerald-200"
                        : payment.cashTendered < total ? "bg-red-50 border border-red-200"
                        : "bg-slate-50 border border-slate-200"
                    }`}>
                      <p className="text-xs text-slate-500 mb-1 flex justify-between">
                        <span>{payment.cashTendered >= total ? "Change Due" : "Amount Remaining"}</span>
                        <span className="dir-rtl">{payment.cashTendered >= total ? "الباقي" : "المبلغ المتبقي"}</span>
                      </p>
                      <p className={`text-3xl font-black ${
                        changeDue > 0 ? "text-emerald-600"
                          : payment.cashTendered < total ? "text-red-600" : "text-slate-800"
                      }`}>
                        {payment.cashTendered >= total
                          ? formatPrice(changeDue)
                          : formatPrice(total - payment.cashTendered)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── CARD PAYMENT ──────────────────── */}
              {payment.method === "POS_CARD" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                    <CreditCard className="h-10 w-10 text-white/50 mx-auto mb-3" />
                    <p className="text-2xl font-black text-white">{formatPrice(total)}</p>
                    <p className="text-xs text-white/50 mt-1">Present card to terminal</p>
                  </div>



                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Transaction Reference (optional)</Label>
                    <Input value={payment.cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="e.g., last 4 digits or auth code" className="h-10 text-sm" />
                  </div>
                </div>
              )}

              {/* ─── MOBILE TRANSFER PAYMENT ───────── */}
              {payment.method === "POS_MOBILE_TRANSFER" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-center">
                    <Smartphone className="h-10 w-10 text-white/50 mx-auto mb-3" />
                    <p className="text-2xl font-black text-white">{formatPrice(total)}</p>
                    <p className="text-xs text-white/50 mt-1">Complete transfer via mobile app</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Transaction Reference (optional)</Label>
                    <Input value={payment.cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      placeholder="e.g., transfer ID" className="h-10 text-sm" />
                  </div>
                </div>
              )}

              {/* ─── CREDIT PAYMENT ────────────────── */}
              {payment.method === "POS_CREDIT" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-center">
                    <FileText className="h-10 w-10 text-white/50 mx-auto mb-3" />
                    <p className="text-2xl font-black text-white">{formatPrice(total)}</p>
                    <p className="text-xs text-white/50 mt-1">Add to customer's credit tab</p>
                  </div>
                  
                  {!customer ? (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-200">
                      Error: A registered customer must be selected to use Store Credit. Please go back and select a customer.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Credit Note / Reference (optional)</Label>
                      <Input value={payment.cardReference}
                        onChange={(e) => setCardReference(e.target.value)}
                        placeholder="e.g., agreed terms or reference" className="h-10 text-sm" />
                    </div>
                  )}
                </div>
              )}

              {/* ─── GIFT CARD PAYMENT ─────────────── */}
              {payment.method === "POS_GIFT_CARD" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Gift Card Code / Barcode</Label>
                    <div className="flex gap-2">
                      <Input value={payment.giftCardCode}
                        onChange={(e) => {
                          setGiftCardCode(e.target.value);
                          setGiftCardBalance(null);
                          setGiftCardError(null);
                          setGiftCardIsPhysical(false);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") validateGiftCard(); }}
                        placeholder="Scan or type gift card code" className="h-10 text-sm flex-1" autoFocus />
                      <Button onClick={validateGiftCard} disabled={isValidatingGiftCard}
                        variant="outline" className="h-10 px-4">
                        {isValidatingGiftCard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400">Press Enter or click Verify to check the card balance</p>
                  </div>

                  {giftCardError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                      <span className="text-red-500 text-sm mt-0.5">⚠</span>
                      <p className="text-xs text-red-700 font-medium">{giftCardError}</p>
                    </div>
                  )}

                  {giftCardBalance !== null && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                      {/* Card type badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Card Verified</span>
                        {giftCardIsPhysical && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-2 py-0.5">
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Physical Card
                          </span>
                        )}
                      </div>

                      {/* Balance rows */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-700">Available Balance</span>
                          <span className="font-bold text-emerald-800">{formatPrice(giftCardBalance)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-700">Applied to this order</span>
                          <span className="font-bold text-emerald-800">− {formatPrice(payment.giftCardDeduction)}</span>
                        </div>
                        {giftCardBalance > payment.giftCardDeduction && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Remaining on card after</span>
                            <span className="font-medium text-slate-600">{formatPrice(giftCardBalance - payment.giftCardDeduction)}</span>
                          </div>
                        )}
                      </div>

                      {/* Partial payment warning + one-click switch to Split */}
                      {giftCardBalance < total && isSplitEnabled && (
                        <div className="border-t border-emerald-200 pt-3 space-y-2">
                          <p className="text-[11px] text-amber-700 font-medium">
                            ⚠️ Card balance is Rs.{formatPrice(total - payment.giftCardDeduction)} short of the total.
                            Use Split Payment to cover the remainder.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              // Switch to split and pre-populate gift card entry + remaining cash entry
                              setSplitPayments([
                                { method: "POS_GIFT_CARD", amount: payment.giftCardDeduction, reference: payment.giftCardCode },
                                { method: "POS_CASH", amount: total - payment.giftCardDeduction, reference: "" },
                              ]);
                              setPaymentMethod("POS_SPLIT");
                            }}
                          >
                            <Split className="h-3 w-3 mr-1.5" />
                            Switch to Split Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── SPLIT PAYMENT ─────────────────── */}
              {payment.method === "POS_SPLIT" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-500">Order Total</span>
                      <span className="font-bold text-slate-800">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Allocated</span>
                      <span className={`font-bold ${splitTotal >= total ? "text-emerald-600" : "text-amber-600"}`}>
                        {formatPrice(splitTotal)}
                      </span>
                    </div>
                    {splitRemaining > 0.01 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-red-500">Remaining</span>
                        <span className="font-bold text-red-600">{formatPrice(splitRemaining)}</span>
                      </div>
                    )}
                  </div>

                  {splitEntries.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                      <select value={entry.method}
                        onChange={(e) => updateSplitEntry(index, "method", e.target.value)}
                        className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="POS_CASH">Cash</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="DEBIT_CARD">Debit Card</option>
                        {isGiftcardsEnabled && <option value="POS_GIFT_CARD">Gift Card</option>}
                      </select>
                      <Input type="number" min={0} step={0.01}
                        value={entry.amount || ""}
                        onChange={(e) => updateSplitEntry(index, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Amount" className="h-8 text-xs flex-1" />
                      {splitRemaining > 0.01 && (
                        <button onClick={() => fillRemainingToEntry(index)}
                          className="text-[10px] text-[#A7066A] hover:underline whitespace-nowrap px-1"
                          title="Fill remaining amount">Fill</button>
                      )}
                      {entry.method !== "POS_CASH" && (
                        <Input value={entry.reference}
                          onChange={(e) => updateSplitEntry(index, "reference", e.target.value)}
                          placeholder="Ref" className="h-8 text-xs w-24" />
                      )}
                      <button onClick={() => removeSplitEntry(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addSplitEntry} className="w-full h-9 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Payment Method
                  </Button>
                </div>
              )}

              <Separator />

              {/* Order Summary */}
              <div className="space-y-1.5 bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="flex gap-2"><span>Subtotal</span><span className="text-[10px] dir-rtl">المجموع الفرعي</span></span>
                  <span className="flex flex-col items-end">
                    <span>{formatPrice(subtotal)}</span>
                    <span className="text-[10px]">{arNum(formatPrice(subtotal))}</span>
                  </span>
                </div>
                {payment.giftCardDeduction > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Gift Card</span><span>-{formatPrice(payment.giftCardDeduction)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-slate-800">Total Due</span>
                  <span className="flex flex-col items-end">
                    <span className="text-lg font-black text-[#A7066A] leading-tight">{formatPrice(total)}</span>
                    <span className="text-sm font-bold text-[#A7066A]">{arNum(formatPrice(total))}</span>
                  </span>
                </div>
              </div>

              {/* Pay Button */}
              <Button onClick={handlePayment}
                disabled={
                  isProcessing || items.length === 0 ||
                  (payment.method === "POS_CASH" && payment.cashTendered < total) ||
                  (payment.method === "POS_SPLIT" && Math.abs(splitRemaining) > 0.01) ||
                  (payment.method === "POS_GIFT_CARD" && giftCardBalance === null) ||
                  (payment.method === "POS_CREDIT" && !customer)
                }
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-xl transition-all">
                {isProcessing ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" />Processing...</>
                ) : (
                  <>Complete Payment<ArrowRight className="h-5 w-5 ml-2" /></>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
