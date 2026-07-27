"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Receipt,
  Percent,
  Gift,
  Loader2,
  X,
  ScanBarcode,
} from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { resolveStorageUrl } from "@/lib/utils";
import { usePosCart } from "@/store/use-pos-cart";
import { CustomerSearch } from "@/components/pos/CustomerSearch";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PosCart() {
  const items = usePosCart((s) => s.items);
  const activeShift = usePosCart((s) => s.activeShift);
  const notes = usePosCart((s) => s.notes);
  const removeItem = usePosCart((s) => s.removeItem);
  const updateItemQuantity = usePosCart((s) => s.updateItemQuantity);
  const setItemDiscount = usePosCart((s) => s.setItemDiscount);
  const clearCart = usePosCart((s) => s.clearCart);
  const setNotes = usePosCart((s) => s.setNotes);
  const openCheckout = usePosCart((s) => s.openCheckout);
  const getSubtotal = usePosCart((s) => s.getSubtotal);
  const getItemCount = usePosCart((s) => s.getItemCount);
  const setGiftCardCode = usePosCart((s) => s.setGiftCardCode);
  const setGiftCardDeduction = usePosCart((s) => s.setGiftCardDeduction);

  const subtotal = getSubtotal();
  const itemCount = getItemCount();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isGiftcardsEnabled = toggles?.storefront_giftcards !== false;

  const { data: discountData } = useSWR("/api/admin/pos/discounts", fetcher);
  const activeDiscounts = discountData?.discounts || [];

  // ─── Voucher state ─────────────────────────────────────────
  const [voucherInput, setVoucherInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    cardId: string;
    code: string;
    balance: number;
    deduction: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const effectiveTotal = appliedVoucher
    ? Math.max(0, subtotal - appliedVoucher.deduction)
    : subtotal;

  const { formatPrice } = useCurrency();

  // ─── Apply voucher ─────────────────────────────────────────
  const handleApplyVoucher = async () => {
    const code = voucherInput.trim();
    if (!code) {
      setVoucherError("Please enter a gift card or voucher code.");
      return;
    }
    setIsValidating(true);
    setVoucherError(null);
    try {
      const res = await fetch("/api/checkout/validate-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, channel: "POS", orderTotal: subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVoucherError(data.message || "Invalid gift card or voucher.");
        return;
      }
      const deduction = Math.min(data.balance, subtotal);
      setAppliedVoucher({ cardId: data.cardId, code: data.code, balance: data.balance, deduction });
      setGiftCardCode(data.code);
      setGiftCardDeduction(deduction);
      setVoucherInput("");
      toast.success(`Voucher applied — ${formatPrice(deduction)} deducted.`, { duration: 3000 });
    } catch {
      setVoucherError("Network error. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  // ─── Remove voucher ────────────────────────────────────────
  const arNum = (n: number | string) => {
    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(n).replace(/[0-9]/g, (w) => arabicNumbers[+w]);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError(null);
    setGiftCardCode("");
    setGiftCardDeduction(0);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Cart Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-[#A7066A] to-[#C4107E]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-white font-semibold text-sm">Current Sale / المبيعات الحالية</h2>
          </div>
          {items.length > 0 && (
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <CustomerSearch />
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300">
            <ShoppingBag className="h-16 w-16 mb-3 stroke-1" />
            <p className="text-sm font-medium text-slate-400">Cart is empty</p>
            <p className="text-xs text-slate-300 mt-1">Scan a barcode or click a product</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="p-3 hover:bg-slate-50/50 transition-colors group">
                <div className="flex gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {item.image ? (
                      <Image src={resolveStorageUrl(item.image)} alt={item.name} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col">
                            <p className="text-xs font-medium text-slate-800 truncate leading-tight">{item.name}</p>
                            {item.nameAr && <p className="text-xs font-semibold text-[#A7066A] truncate leading-tight dir-rtl">{item.nameAr}</p>}
                          </div>
                          {item.isGiftCard && (
                            <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 h-4">
                              Gift Card
                            </Badge>
                          )}
                        </div>
                        {item.sku && <p className="text-[10px] text-slate-400 mt-0.5">{item.sku}</p>}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-0.5" title="Remove item">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center border border-slate-200 rounded-md">
                          <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-slate-100 transition-colors rounded-l-md">
                            <Minus className="h-3 w-3 text-slate-500" />
                          </button>
                          <span className="px-2 text-xs font-semibold min-w-[28px] text-center">{item.quantity}</span>
                          <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} className="p-1 hover:bg-slate-100 transition-colors rounded-r-md disabled:opacity-40">
                            <Plus className="h-3 w-3 text-slate-500" />
                          </button>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 text-slate-400 hover:text-[#A7066A] transition-colors ml-1" title="Apply Discount">
                              <Tag className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => setItemDiscount(item.id, { id: null, name: null, type: null, value: null })}>
                              Remove Discount
                            </DropdownMenuItem>
                            {activeDiscounts.map((d: any) => (
                              <DropdownMenuItem key={d.id} onClick={() => setItemDiscount(item.id, { id: d.id, name: d.name, type: d.type, value: d.value })}>
                                {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : formatPrice(d.value)})
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {item.discountPercent > 0 && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] px-1 py-0 ml-1" title={item.discountName || "Discount Applied"}>
                            <Percent className="h-2.5 w-2.5 mr-0.5" />{item.discountPercent.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-800">{formatPrice(item.subtotal)}</span>
                        <span className="text-xs font-bold text-[#A7066A]">{arNum(formatPrice(item.subtotal))}</span>
                        {item.effectivePrice !== item.price && (
                          <span className="text-[10px] text-slate-400 line-through mt-0.5">{formatPrice(item.price * item.quantity)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Notes */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100">
          <Input
            placeholder="Order notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>
      )}

      {/* ─── Gift Card / Voucher Widget ─────────────────────── */}
      {items.length > 0 && isGiftcardsEnabled && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <Gift className="h-3 w-3 text-[#A7066A]" />
            Gift Card / Paper Voucher
          </p>

          {appliedVoucher ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-bold text-emerald-800 font-mono">{appliedVoucher.code}</p>
                <p className="text-[10px] text-emerald-600">
                  −{formatPrice(appliedVoucher.deduction)} applied
                  {appliedVoucher.balance > appliedVoucher.deduction && (
                    <> · {formatPrice(appliedVoucher.balance - appliedVoucher.deduction)} remaining</>
                  )}
                </p>
              </div>
              <button onClick={handleRemoveVoucher} className="p-1 rounded-md text-emerald-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Remove voucher">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={voucherInput}
                    onChange={(e) => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                    placeholder="Scan or type code..."
                    className="h-8 pl-8 text-xs font-mono border-slate-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                    disabled={isValidating}
                  />
                </div>
                <Button size="sm" onClick={handleApplyVoucher} disabled={isValidating || !voucherInput.trim()} className="h-8 px-3 bg-[#A7066A] hover:bg-[#8A0558] text-white text-xs">
                  {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {voucherError && <p className="text-[10px] text-rose-600 font-medium leading-tight">{voucherError}</p>}
            </>
          )}
        </div>
      )}

      {/* Totals & Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 items-end">
            <span className="flex flex-col">
              <span>Subtotal ({itemCount} items)</span>
              <span className="text-[10px] dir-rtl">المجموع الفرعي</span>
            </span>
            <span className="flex flex-col items-end">
              <span>{formatPrice(subtotal)}</span>
              <span className="text-[10px]">{arNum(formatPrice(subtotal))}</span>
            </span>
          </div>
          {appliedVoucher && (
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Voucher ({appliedVoucher.code})</span>
              <span>−{formatPrice(appliedVoucher.deduction)}</span>
            </div>
          )}
          <Separator className="bg-slate-200" />
          <div className="flex justify-between items-end">
            <span className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-xs font-bold text-slate-600 dir-rtl">المجموع</span>
            </span>
            <span className="flex flex-col items-end">
              <span className="text-lg font-black text-[#A7066A] leading-tight">{formatPrice(effectiveTotal)}</span>
              <span className="text-sm font-bold text-[#A7066A]">{arNum(formatPrice(effectiveTotal))}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={clearCart} disabled={items.length === 0} className="h-11 text-xs border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear
          </Button>
          <Button onClick={openCheckout} disabled={items.length === 0 || !activeShift} className="h-11 text-xs bg-[#A7066A] hover:bg-[#8A0558] text-white shadow-lg shadow-pink-200/50 transition-all">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />Charge
          </Button>
        </div>

        {!activeShift && items.length > 0 && (
          <p className="text-[10px] text-amber-600 text-center font-medium">⚠️ Open a shift to process sales</p>
        )}
      </div>
    </div>
  );
}
