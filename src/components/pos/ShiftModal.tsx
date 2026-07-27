"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Coins,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Gift,
  RefreshCcw,
} from "lucide-react";
import { usePosCart } from "@/store/use-pos-cart";
import { LKR_DENOMINATIONS } from "@/types/pos";
import { useCurrency } from "@/components/CurrencyProvider";
import type { DenominationCount } from "@/types/pos";
import { toast } from "sonner";

export function ShiftModal() {
  const isOpen = usePosCart((s) => s.isShiftModalOpen);
  const mode = usePosCart((s) => s.shiftModalMode);
  const activeShift = usePosCart((s) => s.activeShift);
  const closeShiftModal = usePosCart((s) => s.closeShiftModal);
  const setActiveShift = usePosCart((s) => s.setActiveShift);
  const fetchActiveShift = usePosCart((s) => s.fetchActiveShift);

  const { formatPrice, currency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [startingCash, setStartingCash] = useState<string>("0");
  const [closeNotes, setCloseNotes] = useState("");
  const [actualCredit, setActualCredit] = useState<string>("0");
  const [actualDebit, setActualDebit] = useState<string>("0");
  const [actualGiftCards, setActualGiftCards] = useState<string>("0");

  // System-calculated EOD totals fetched from /api/admin/pos/cash-close
  const [eodSummary, setEodSummary] = useState<{
    systemCredit:   number;
    systemDebit:    number;
    systemGiftCard: number;
    systemCash:     number;
    orderCount:     number;
    isFetching:     boolean;
    fetchError:     string | null;
  }>({
    systemCredit:   0,
    systemDebit:    0,
    systemGiftCard: 0,
    systemCash:     0,
    orderCount:     0,
    isFetching:     false,
    fetchError:     null,
  });

  // Dynamic database currency state
  const [denomCounts, setDenomCounts] = useState<DenominationCount[]>([]);

  // Fetch system-calculated EOD payment totals for the active shift
  const fetchEodSummary = async (shiftId: string) => {
    setEodSummary((prev) => ({ ...prev, isFetching: true, fetchError: null }));
    try {
      const res  = await fetch(`/api/admin/pos/cash-close?shiftId=${shiftId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setEodSummary((prev) => ({
          ...prev,
          isFetching: false,
          fetchError: json.message || "Failed to load system totals",
        }));
        return;
      }

      // paymentSummary is an array: [{ paymentMethod, systemAmount, ... }, ...]
      const summary: Array<{ paymentMethod: string; systemAmount: number }> =
        json.paymentSummary ?? [];

      const byMethod = Object.fromEntries(
        summary.map((s) => [s.paymentMethod, s.systemAmount ?? 0])
      );

      // POS_CARD covers both credit and debit (split 50/50 if no separate tracking)
      const cardTotal     = byMethod["POS_CARD"]     ?? 0;
      const creditTotal   = byMethod["CREDIT_CARD"]   ?? 0;
      const debitTotal    = byMethod["DEBIT_CARD"]    ?? 0;
      const giftCardTotal = byMethod["POS_GIFT_CARD"] ?? 0;
      const cashTotal     = byMethod["POS_CASH"]      ?? 0;
      const orderCount    = json.totals?.orderCount   ?? 0;

      setEodSummary({
        systemCredit:   Math.round((creditTotal + cardTotal) * 100) / 100,
        systemDebit:    Math.round(debitTotal    * 100) / 100,
        systemGiftCard: Math.round(giftCardTotal * 100) / 100,
        systemCash:     Math.round(cashTotal     * 100) / 100,
        orderCount,
        isFetching: false,
        fetchError: null,
      });

      // Pre-populate operator fields with system values as starting point
      // Operators can override these before submitting.
      setActualCredit(String(Math.round((creditTotal + cardTotal) * 100) / 100));
      setActualDebit(String(Math.round(debitTotal * 100) / 100));
      setActualGiftCards(String(Math.round(giftCardTotal * 100) / 100));
    } catch (err) {
      console.error("[ShiftModal] EOD summary fetch error:", err);
      setEodSummary((prev) => ({
        ...prev,
        isFetching: false,
        fetchError: "Network error fetching system totals",
      }));
    }
  };

  // Fetch active denominations from database
  useEffect(() => {
    async function loadDenominations() {
      try {
        const res = await fetch("/api/admin/denominations?active=true");
        const json = await res.json();

        if (json.success && json.denominations && json.denominations.length > 0) {
          const formatted = json.denominations.map((d: any) => ({
            value: d.value,
            label: formatPrice(d.value) + (currency === "OMR" && d.value < 1 ? ` (${Math.round(d.value * 1000)} Baisa)` : ""),
            type: d.type as "NOTE" | "COIN",
            count: 0,
          }));
          setDenomCounts(formatted);
        } else {
          setDenomCounts(LKR_DENOMINATIONS.map((d) => ({ ...d, count: 0 })));
        }
      } catch (err) {
        console.error("Failed to fetch database denominations", err);
        setDenomCounts(LKR_DENOMINATIONS.map((d) => ({ ...d, count: 0 })));
      }
    }

    if (isOpen) {
      loadDenominations();
      setStep(1);
      setStartingCash("0");
      setCloseNotes("");
      // Reset fields first; they'll be overwritten by fetchEodSummary if shiftId exists
      setActualCredit("0");
      setActualDebit("0");
      setActualGiftCards("0");
      setEodSummary({ systemCredit: 0, systemDebit: 0, systemGiftCard: 0, systemCash: 0, orderCount: 0, isFetching: false, fetchError: null });

      if (mode === "close") {
        fetchActiveShift();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, fetchActiveShift]);

  // When activeShift is populated (after fetchActiveShift resolves) in close mode,
  // fetch the system-calculated EOD payment totals to pre-fill Step 3 fields.
  useEffect(() => {
    if (isOpen && mode === "close" && activeShift?.id) {
      fetchEodSummary(activeShift.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, activeShift?.id]);

  // Calculate total from denomination counts
  const denominationTotal = useMemo(() => {
    return denomCounts.reduce((sum, d) => sum + d.value * d.count, 0);
  }, [denomCounts]);

  const updateDenomCount = (index: number, count: number) => {
    const updated = [...denomCounts];
    updated[index] = { ...updated[index], count: Math.max(0, count) };
    setDenomCounts(updated);

    // Update starting cash state for opening mode
    const newTotal = updated.reduce((sum, d) => sum + d.value * d.count, 0);
    if (mode === "open") {
      setStartingCash(String(newTotal));
    }
  };

  // Build denomination counts for route handler
  const buildDenominationPayload = () => {
    return denomCounts.map((d) => ({
      value: d.value,
      quantity: d.count,
    }));
  };

  // ─── Start Shift ─────────────────────────────────────────
  const handleStartShift = async () => {
    const cash = parseFloat(startingCash) || 0;
    if (cash < 0) {
      toast.error("Starting cash cannot be negative");
      return;
    }

    setIsLoading(true);
    try {
      const denominationsPayload = buildDenominationPayload();

      const res = await fetch("/api/admin/pos/shift/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          denominations: denominationsPayload,
          notes: `Shift started with cash drawer total: Rs. ${cash}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to start shift");
        return;
      }

      setActiveShift({
        id: data.shift.id,
        operatorId: data.shift.operatorId,
        operatorName: data.shift.operatorName || "POS Operator",
        startTime: data.shift.openedAt,
        endTime: null,
        startingCash: data.shift.openingCash,
        expectedCash: data.shift.expectedCash,
        actualCash: null,
        expectedCredit: 0,
        actualCredit: null,
        cashVariance: null,
        creditVariance: null,
        status: "OPEN",
        notes: null,
        totalOrders: 0,
        totalSales: 0,
      });

      toast.success("POS Shift initialized successfully", {
        position: "top-center",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
      closeShiftModal();
    } catch (error) {
      console.error("Start shift error:", error);
      toast.error("Failed to start shift");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Close Shift ─────────────────────────────────────────
  const handleCloseShift = async () => {
    if (!activeShift) return;

    setIsLoading(true);
    try {
      const denominationsPayload = buildDenominationPayload();
      const creditAmount = parseFloat(actualCredit) || 0;
      const debitAmount = parseFloat(actualDebit) || 0;

      const res = await fetch("/api/admin/pos/shift/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: activeShift.id,
          denominations: denominationsPayload,
          actualCredit: creditAmount,
          actualDebit: debitAmount,
          notes: closeNotes || `Drawer counted actual cash: Rs. ${denominationTotal}. Credit Card: Rs. ${creditAmount}. Debit Card: Rs. ${debitAmount}. Gift cards: Rs. ${actualGiftCards}.`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to close shift");
        return;
      }

      setActiveShift(null);
      toast.success("EOD Sequence finalized and DB synchronized", {
        position: "top-center",
        className: "bg-amber-50 border-amber-200 text-amber-800",
      });
      closeShiftModal();
    } catch (error) {
      console.error("Close shift error:", error);
      toast.error("Failed to close shift");
    } finally {
      setIsLoading(false);
    }
  };

  const cashVarianceVal = useMemo(() => {
    if (!activeShift) return 0;
    return Math.round((denominationTotal - activeShift.expectedCash) * 100) / 100;
  }, [denominationTotal, activeShift]);

  // Render denomination counter grid
  const renderDenominationGrid = (accentColor: "emerald" | "amber") => {
    const isNote = (d: DenominationCount) => d.type === "NOTE";
    const bgHeader = accentColor === "emerald" ? "bg-emerald-500/10 text-emerald-800" : "bg-amber-500/10 text-amber-800";

    return (
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {/* Notes Grid */}
        <div>
          <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${bgHeader}`}>
            <Banknote className="h-3 w-3" /> Currency Notes
          </div>
          <div className="grid grid-cols-1 gap-2">
            {denomCounts.filter(isNote).map((d) => {
              const index = denomCounts.findIndex((dc) => dc.value === d.value);
              return (
                <div key={`note-${d.value}`} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-700 w-16">{d.label}</span>
                  <span className="text-[10px] text-slate-400">×</span>
                  <Input
                    type="number"
                    min={0}
                    value={d.count || ""}
                    onChange={(e) => updateDenomCount(index, parseInt(e.target.value) || 0)}
                    className="h-8 w-24 text-center font-bold text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs font-semibold text-slate-500 ml-auto">= {formatPrice(d.value * d.count)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins Grid */}
        <div>
          <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${bgHeader}`}>
            <Coins className="h-3 w-3" /> Coins
          </div>
          <div className="grid grid-cols-1 gap-2">
            {denomCounts.filter(d => !isNote(d)).map((d) => {
              const index = denomCounts.findIndex((dc) => dc.value === d.value);
              return (
                <div key={`coin-${d.value}`} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-700 w-16">{d.label}</span>
                  <span className="text-[10px] text-slate-400">×</span>
                  <Input
                    type="number"
                    min={0}
                    value={d.count || ""}
                    onChange={(e) => updateDenomCount(index, parseInt(e.target.value) || 0)}
                    className="h-8 w-24 text-center font-bold text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs font-semibold text-slate-500 ml-auto">= {formatPrice(d.value * d.count)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && closeShiftModal()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto border-0 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${mode === "open" ? "bg-emerald-500/10 text-emerald-700 animate-pulse" : "bg-amber-500/10 text-amber-700"}`}>
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-lg font-black text-slate-900 leading-tight">
                {mode === "open" ? "Initialize POS Session" : "Finalize EOD Cash Close"}
              </span>
              <span className="text-xs text-slate-500 mt-0.5">
                GiftBox Lanka Retail POS Terminal
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ─── MULTIPHASE WIZARD FOR OPENING SHIFT ─── */}
        {mode === "open" && (
          <div className="space-y-6 mt-4">
            {/* Step 1: Policy Checklist */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-50 to-slate-50 p-5 rounded-2xl border border-emerald-100 space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security & Reconciliation Policy
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                    <li>Reconcile baseline cash drawer counts before transactions.</li>
                    <li>Always input physical note counts Autoratatively.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-2">
                  <Label className="text-xs text-slate-400">Terminal Operator</Label>
                  <p className="text-sm font-black text-slate-800">
                    {activeShift?.operatorName || "POS Admin / Operator"}
                  </p>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 rounded-xl shadow-lg mt-4"
                >
                  Confirm Policy & Proceed <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Note Counting Grid */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Note counts to calculate baseline opening cash:
                </Label>

                {renderDenominationGrid("emerald")}

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-emerald-800">Calculated Cash Drawer</span>
                  <span className="text-base font-black text-emerald-700">{formatPrice(denominationTotal)}</span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 rounded-xl text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={denominationTotal === 0}
                    className="flex-1 h-11 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold text-xs gap-1.5 rounded-xl shadow-md"
                  >
                    Next Phase <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Final Baseline Confirmation */}
            {step === 3 && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-800">Confirm Cash Drawer Opening Balance</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Your baseline opening cash drawer has been set to the dynamic cash denomination calculation:
                  </p>
                  <div className="text-3xl font-black text-slate-900 py-4 tracking-tight">
                    {formatPrice(denominationTotal)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                    className="h-11 rounded-xl text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleStartShift}
                    disabled={isLoading}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Open Terminal & Start Day
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MULTIPHASE WIZARD FOR CLOSING SHIFT (EOD) ─── */}
        {mode === "close" && activeShift && (
          <div className="space-y-6 mt-4">
            {/* Step 1: Expected vs Actual Summary */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Metrics</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">Opened At</p>
                      <p className="font-bold text-slate-800">{new Date(activeShift.startTime).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Opening Cash</p>
                      <p className="font-bold text-slate-800">{formatPrice(activeShift.startingCash)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Completed Orders</p>
                      <p className="font-bold text-slate-800">{activeShift.totalOrders} Sales</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total Net sales</p>
                      <p className="font-bold text-[#A7066A]">{formatPrice(activeShift.totalSales)}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 rounded-xl shadow-lg mt-4"
                >
                  Start Reconciliation Count <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Note Counting Grid */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Key in current cash note quantities for the drawer count:
                </Label>

                {renderDenominationGrid("amber")}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Cash</span>
                    <span className="text-sm font-bold text-slate-700">{formatPrice(activeShift.expectedCash)}</span>
                  </div>
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Drawer Total</span>
                    <span className="text-sm font-bold text-amber-700">{formatPrice(denominationTotal)}</span>
                  </div>
                </div>

                {/* Live Variance */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  Math.abs(cashVarianceVal) < 0.01
                    ? "bg-emerald-50 border-emerald-200"
                    : cashVarianceVal > 0
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  <span className="text-xs font-bold text-slate-600">Calculated Cash Variance</span>
                  <span className={`text-xs font-black flex items-center gap-1 ${
                    Math.abs(cashVarianceVal) < 0.01
                      ? "text-emerald-700"
                      : cashVarianceVal > 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}>
                    {cashVarianceVal > 0 ? "+" : ""}
                    {formatPrice(cashVarianceVal)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 rounded-xl text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="flex-1 h-11 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold text-xs gap-1.5 rounded-xl shadow-md"
                  >
                    Next Phase <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Card & Gift Card Manual Inputs */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Reconcile non-cash transactions:
                  </Label>
                  {/* Refresh system totals button */}
                  <button
                    type="button"
                    onClick={() => activeShift && fetchEodSummary(activeShift.id)}
                    disabled={eodSummary.isFetching}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#A7066A] hover:text-[#8A0558] transition-colors disabled:opacity-40"
                  >
                    <RefreshCcw className={`h-3 w-3 ${eodSummary.isFetching ? "animate-spin" : ""}`} />
                    {eodSummary.isFetching ? "Loading..." : "Refresh System Totals"}
                  </button>
                </div>

                {/* System fetch error banner */}
                {eodSummary.fetchError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{eodSummary.fetchError} — enter amounts manually below.</span>
                  </div>
                )}

                {/* System-calculated summary banner */}
                {!eodSummary.fetchError && !eodSummary.isFetching && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[10px] font-semibold text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    System-calculated totals pre-filled from {eodSummary.orderCount} POS order{eodSummary.orderCount !== 1 ? "s" : ""}. Edit below if your physical terminal count differs.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Credit Cards */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Credit Cards
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={actualCredit}
                      onChange={(e) => setActualCredit(e.target.value)}
                      className="h-9 font-semibold text-xs"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      System:
                      <span className={`font-bold ${
                        eodSummary.isFetching ? "text-slate-300" : "text-slate-600"
                      }`}>
                        {eodSummary.isFetching
                          ? "…"
                          : formatPrice(eodSummary.systemCredit)
                        }
                      </span>
                      {!eodSummary.isFetching &&
                        Math.abs((parseFloat(actualCredit) || 0) - eodSummary.systemCredit) > 0.01 && (
                          <span className="text-amber-600 font-bold ml-1">⚠ variance</span>
                        )
                      }
                    </p>
                  </div>

                  {/* Debit Cards */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Debit Cards
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={actualDebit}
                      onChange={(e) => setActualDebit(e.target.value)}
                      className="h-9 font-semibold text-xs"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      System:
                      <span className={`font-bold ${
                        eodSummary.isFetching ? "text-slate-300" : "text-slate-600"
                      }`}>
                        {eodSummary.isFetching
                          ? "…"
                          : formatPrice(eodSummary.systemDebit)
                        }
                      </span>
                      {!eodSummary.isFetching &&
                        Math.abs((parseFloat(actualDebit) || 0) - eodSummary.systemDebit) > 0.01 && (
                          <span className="text-amber-600 font-bold ml-1">⚠ variance</span>
                        )
                      }
                    </p>
                  </div>

                  {/* Gift Cards Redeemed */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5 text-slate-400" /> Gift Cards Redeemed
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={actualGiftCards}
                      onChange={(e) => setActualGiftCards(e.target.value)}
                      className="h-9 font-semibold text-xs"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      System:
                      <span className={`font-bold ${
                        eodSummary.isFetching ? "text-slate-300" : "text-slate-600"
                      }`}>
                        {eodSummary.isFetching
                          ? "…"
                          : formatPrice(eodSummary.systemGiftCard)
                        }
                      </span>
                      {!eodSummary.isFetching &&
                        Math.abs((parseFloat(actualGiftCards) || 0) - eodSummary.systemGiftCard) > 0.01 && (
                          <span className="text-amber-600 font-bold ml-1">⚠ variance</span>
                        )
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-11 rounded-xl text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 h-11 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold text-xs gap-1.5 rounded-xl shadow-md"
                  >
                    Reconciliation Notes <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Notes and Final Submit */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reconciliation Notes & Discrepancy details:
                </Label>

                <div className="space-y-1.5">
                  <Textarea
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Detail any variances, drawer note replacements, or cashier comments here..."
                    className="resize-none text-xs rounded-xl"
                    rows={4}
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> End of Day Submission Notice
                  </p>
                  <p className="leading-relaxed">
                    Submitting close counts commits cash count logs to core DB registers. This action locks POS session sales permanently.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    disabled={isLoading}
                    className="h-11 rounded-xl text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleCloseShift}
                    disabled={isLoading}
                    className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Reconcile & Close Shift
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
