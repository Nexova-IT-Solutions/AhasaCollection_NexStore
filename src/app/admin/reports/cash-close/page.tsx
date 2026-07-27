"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Banknote,
  Calendar,
  Loader2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Gift,
  ArrowRightLeft,
  RefreshCcw,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { ExcelExportUtility } from "@/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrency } from "@/components/CurrencyProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface ShiftRecord {
  shiftId: string;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
  openingCash: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
  expectedCredit: number;
  actualCredit: number | null;
  creditVariance: number | null;
  expectedDebit: number;
  actualDebit: number | null;
  debitVariance: number | null;
  expectedGiftCard: number;
  actualGiftCard: number | null;
  giftCardVariance: number | null;
  totalOrders: number;
  notes: string | null;
}

interface CashCloseData {
  shifts: ShiftRecord[];
  summary: {
    totalShifts: number;
    closedShifts: number;
    openShifts: number;
    totalExpectedCash: number;
    totalActualCash: number;
    totalCashVariance: number;
    totalExpectedCredit: number;
    totalActualCredit: number;
    totalCreditVariance: number;
    totalExpectedDebit: number;
    totalActualDebit: number;
    totalDebitVariance: number;
    totalExpectedGiftCard: number;
    totalActualGiftCard: number;
    totalGiftCardVariance: number;
    totalOrders: number;
  };
}

interface CashCountItem {
  value: number;
  quantity: number;
  type: "OPENING" | "CLOSING";
}

interface DetailedShift {
  id: string;
  operatorName: string;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
  openingCash: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
  expectedCredit: number;
  actualCredit: number | null;
  creditVariance: number | null;
  expectedDebit: number;
  actualDebit: number | null;
  debitVariance: number | null;
  expectedGiftCard: number;
  actualGiftCard: number | null;
  giftCardVariance: number | null;
  notes: string | null;
  totalOrders: number;
  cashCounts: CashCountItem[];
}

// ─── EOD Payment Breakdown Types ───────────────────────────────────────────

interface PaymentMethodSummary {
  paymentMethod:  string;
  label:          string;
  icon:           string;
  systemAmount:   number;
  operatorAmount: number | null;
  variance:       number | null;
}

interface EodBreakdownData {
  paymentSummary: PaymentMethodSummary[];
  totals: {
    systemCalculated: number;
    orderCount:       number;
    totalSales?:      number;
  };
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  "banknote":    <Banknote    className="h-4 w-4" />,
  "credit-card": <CreditCard  className="h-4 w-4" />,
  "gift":        <Gift        className="h-4 w-4" />,
  "split":       <ArrowRightLeft className="h-4 w-4" />,
};


const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function VarianceBadge({ value }: { value: number | null }) {
  const { formatPrice } = useCurrency();

  if (value === null || value === undefined) {
    return (
      <span className="text-xs text-slate-450 italic">—</span>
    );
  }

  if (Math.abs(value) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-650">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Balanced
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
        <TrendingUp className="h-3.5 w-3.5 animate-bounce" />
        +{formatPrice(value)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-605">
      <TrendingDown className="h-3.5 w-3.5" />
      {formatPrice(value)}
    </span>
  );
}

export default function CashCloseReportPage() {
  const { formatPrice, symbol } = useCurrency();
  const [data, setData] = useState<CashCloseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to today
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);



  const handleExportExcel = async () => {
    if (!data) return;
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Cash Close / EOD Reconciliation Report",
        filename: `Cash_Close_Report_${startDate}_to_${endDate}`,
        columns: [
          { header: "Opened At", key: "openedAt", type: "date" },
          { header: "Closed At", key: "closedAt", type: "date" },
          { header: "Operator Name", key: "operatorName", type: "string" },
          { header: "Status", key: "status", type: "string", alignment: "center" },
          { header: "Opening Cash (LKR)", key: "openingCash", type: "currency", alignment: "right" },
          { header: "Expected Cash (LKR)", key: "expectedCash", type: "currency", alignment: "right" },
          { header: "Actual Cash (LKR)", key: "actualCash", type: "currency", alignment: "right" },
          { header: "Cash Variance (LKR)", key: "variance", type: "currency", alignment: "right" },
          { header: "Expected Credit (LKR)", key: "expectedCredit", type: "currency", alignment: "right" },
          { header: "Actual Credit (LKR)", key: "actualCredit", type: "currency", alignment: "right" },
          { header: "Credit Variance (LKR)", key: "creditVariance", type: "currency", alignment: "right" },
          { header: "Total Orders", key: "totalOrders", type: "number", alignment: "center" },
        ],
        data: data.shifts || [],
        includeSummaryRow: true,
      });
    } catch (err) {
      console.error("[CashClose] Export failed:", err);
    }
  };

  // Detailed shift modal state
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [detailedShift, setDetailedShift] = useState<DetailedShift | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/reports/cash-close?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load report");
        return;
      }

      setData(json);
    } catch (err) {
      console.error("[CashClose] Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load detailed shift data when selection changes
  useEffect(() => {
    if (!selectedShiftId) {
      setDetailedShift(null);
      return;
    }

    async function loadDetails() {
      setIsLoadingDetails(true);
      try {
        const res = await fetch(`/api/admin/reports/cash-close?shiftId=${selectedShiftId}`);
        const json = await res.json();
        if (json.success && json.shift) {
          setDetailedShift(json.shift);
        } else {
          toast.error("Failed to load shift details");
        }
      } catch (err) {
        console.error("Failed to load shift details:", err);
        toast.error("Network error loading shift details.");
      } finally {
        setIsLoadingDetails(false);
      }
    }
    loadDetails();
  }, [selectedShiftId]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cash Close / EOD Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Shift reconciliation, denomination audits, and cash drawer variance registers
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-end gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs w-[140px]"
            />
          </div>
          <Button
            onClick={fetchData}
            disabled={isLoading}
            size="sm"
            className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-xl shadow-md px-4 font-bold text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Apply</span>
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={!data || isLoading}
            variant="outline"
            size="sm"
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-bold text-xs rounded-xl shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* ─── Premium Tab Navigation ─── */}
      <div className="bg-slate-100/60 p-1.5 rounded-2xl inline-flex border border-slate-200/80 shadow-inner">
        <Link
          href="/admin/pos/shifts"
          className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 text-[#6B5A64] hover:text-[#1F1720]"
        >
          Shift Sessions
        </Link>
        <Link
          href="/admin/reports/cash-close"
          className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 bg-white text-[#A7066A] shadow-sm scale-105"
        >
          Reconciliation & EOD Reports
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
          <p className="text-xs font-semibold text-slate-400">Synchronizing EOD Registers...</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Shifts */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2.5 bg-slate-100 rounded-xl">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Shifts
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {data.summary.totalShifts}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold rounded-md">
                    {data.summary.closedShifts} closed
                  </Badge>
                  {data.summary.openShifts > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 font-bold rounded-md animate-pulse">
                      {data.summary.openShifts} open
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total Cash Expected */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/50 to-white overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <Banknote className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Expected Cash
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {formatPrice(data.summary.totalExpectedCash)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Actual drawer: {formatPrice(data.summary.totalActualCash)}
                </p>
              </CardContent>
            </Card>

            {/* Cash Variance */}
            <Card className={`border-0 shadow-md bg-gradient-to-br overflow-hidden ${
              data.summary.totalCashVariance >= 0 ? "from-blue-50/30 to-white" : "from-red-50/30 to-white"
            }`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2.5 rounded-xl ${
                    data.summary.totalCashVariance >= 0 ? "bg-blue-100" : "bg-red-100"
                  }`}>
                    {data.summary.totalCashVariance >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-700" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-700" />
                    )}
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Net Cash Variance
                </p>
                <p className={`text-2xl font-black mt-1 ${
                  Math.abs(data.summary.totalCashVariance) < 0.01
                    ? "text-slate-900"
                    : data.summary.totalCashVariance > 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}>
                  {data.summary.totalCashVariance > 0 ? "+" : ""}
                  {formatPrice(data.summary.totalCashVariance)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Across {data.summary.closedShifts} closed registers
                </p>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/30 to-white overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2.5 bg-purple-100 rounded-xl">
                    <FileText className="h-5 w-5 text-purple-700" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Orders
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {data.summary.totalOrders}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Card net: {formatPrice(data.summary.totalActualCredit)}
                </p>
              </CardContent>
            </Card>
          </div>



          {/* Shift Reconciliation Table */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-[#A7066A]" />
                Daily Shift Audit Registers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.shifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-450">
                  <Clock className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                  <p className="text-xs font-bold">No shift registers found</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Try adjusting the calendar range above
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 pl-6">
                          Date
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5">
                          Operator
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5">
                          Open Time
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5">
                          Close Time
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-right">
                          Opening Cash
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-right">
                          Expected Cash
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-right">
                          Actual Counted
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-right">
                          Variance
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-center">
                          Orders
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-center">
                          Status
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase py-3.5 text-center pr-6">
                          Audit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.shifts.map((shift) => (
                        <TableRow
                          key={shift.shiftId}
                          onClick={() => setSelectedShiftId(shift.shiftId)}
                          className={`transition-colors cursor-pointer group ${
                            shift.variance !== null && shift.variance < 0
                              ? "bg-red-50/15 hover:bg-red-50/25"
                              : shift.variance !== null && shift.variance > 0
                              ? "bg-emerald-50/10 hover:bg-emerald-50/20"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <TableCell className="text-xs font-bold text-slate-700 pl-6 py-4">
                            {formatDate(shift.openedAt)}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                <User className="h-3 w-3 text-slate-500" />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                {shift.operatorName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 py-4">
                            {formatTime(shift.openedAt)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 py-4">
                            {shift.closedAt ? formatTime(shift.closedAt) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] rounded-md font-bold animate-pulse">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right text-slate-500 font-mono py-4">
                            {formatPrice(shift.openingCash)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-slate-700 font-mono py-4">
                            {formatPrice(shift.expectedCash)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-slate-700 font-mono py-4">
                            {shift.actualCash !== null
                              ? formatPrice(shift.actualCash)
                              : <span className="text-slate-350 italic">—</span>
                            }
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <VarianceBadge value={shift.variance} />
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {shift.totalOrders}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-4">
                            {shift.status === "CLOSED" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-bold rounded-md">
                                Closed
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-bold rounded-md animate-pulse">
                                Open
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-4 pr-6">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-slate-200 group-hover:text-[#A7066A]">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── SHIFT DETAILS RECONCILIATION MODAL ─── */}
      <Dialog open={!!selectedShiftId} onOpenChange={(open) => !open && setSelectedShiftId(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#A7066A]/10 to-[#A7066A]/5 text-[#A7066A] rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-black text-slate-800 leading-tight">Shift Audit Breakdown</span>
                <span className="text-xs text-slate-400 mt-0.5">Autoratative Currency & Card Reconciliations</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails && !detailedShift && (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#A7066A]" />
              <p className="text-xs font-semibold text-slate-400">Loading Cash Snapshots...</p>
            </div>
          )}

          {detailedShift && (
            <div className="space-y-6 pt-4">
              {/* Header metrics card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-450 block font-semibold text-[10px] uppercase">Cashier Operator</span>
                  <span className="font-extrabold text-slate-700">{detailedShift.operatorName}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold text-[10px] uppercase">Terminal Status</span>
                  <Badge className={`text-[9px] rounded-md font-bold mt-0.5 ${
                    detailedShift.status === "CLOSED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {detailedShift.status === "CLOSED" ? "CLOSED" : "OPEN"}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold text-[10px] uppercase">Opened At</span>
                  <span className="font-bold text-slate-600">{new Date(detailedShift.openedAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-semibold text-[10px] uppercase">Closed At</span>
                  <span className="font-bold text-slate-600">
                    {detailedShift.closedAt ? new Date(detailedShift.closedAt).toLocaleString() : "Active Session"}
                  </span>
                </div>
              </div>

              {/* Cash Ledger Reconciliation */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-[#A7066A]" /> Cash Ledger Reconciliation
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Opening Drawer</span>
                    <span className="text-xs font-black text-slate-700">{formatPrice(detailedShift.openingCash)}</span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Expected End</span>
                    <span className="text-xs font-black text-slate-700">{formatPrice(detailedShift.expectedCash)}</span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Actual Counted</span>
                    <span className="text-xs font-black text-slate-700">
                      {detailedShift.actualCash !== null ? formatPrice(detailedShift.actualCash) : "—"}
                    </span>
                  </div>
                </div>

                {detailedShift.status === "CLOSED" && (
                  <div className={`p-3 rounded-lg border flex items-center justify-between ${
                    Math.abs(detailedShift.variance ?? 0) < 0.01
                      ? "bg-emerald-50 border-emerald-100"
                      : (detailedShift.variance ?? 0) > 0
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-red-50 border-red-100"
                  }`}>
                    <span className="text-xs font-bold text-slate-600">Calculated Cash Discrepancy</span>
                    <span className={`text-xs font-black flex items-center gap-0.5 ${
                      Math.abs(detailedShift.variance ?? 0) < 0.01
                        ? "text-emerald-700"
                        : (detailedShift.variance ?? 0) > 0
                        ? "text-emerald-700"
                        : "text-red-750"
                    }`}>
                      {(detailedShift.variance ?? 0) > 0 ? "+" : ""}
                      {formatPrice(detailedShift.variance ?? 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Denomination Snapshot Audit */}
              {detailedShift.cashCounts && detailedShift.cashCounts.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#A7066A]" /> Itemized Currency Snapshots
                  </h4>
                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/20">
                    <Table>
                      <TableHeader className="bg-slate-50/60">
                        <TableRow>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 pl-4">Denomination</TableHead>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-center">Opening Count</TableHead>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-center">Closing Count</TableHead>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-right pr-4">Closing Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set(detailedShift.cashCounts.map(c => c.value)))
                          .sort((a, b) => b - a)
                          .map((val) => {
                            const openingItem = detailedShift.cashCounts.find(c => c.value === val && c.type === "OPENING");
                            const closingItem = detailedShift.cashCounts.find(c => c.value === val && c.type === "CLOSING");
                            const openQty = openingItem?.quantity ?? 0;
                            const closeQty = closingItem?.quantity ?? 0;

                            if (openQty === 0 && closeQty === 0) return null;

                            return (
                              <TableRow key={`det-${val}`} className="hover:bg-slate-50/40">
                                <TableCell className="font-bold text-slate-700 py-2 pl-4 text-xs">{formatPrice(val)}</TableCell>
                                <TableCell className="text-center font-mono py-2 text-xs text-slate-500">{openQty} Qty</TableCell>
                                <TableCell className="text-center font-mono py-2 text-xs font-bold text-slate-800">{closeQty} Qty</TableCell>
                                <TableCell className="text-right font-mono py-2 text-xs font-bold text-slate-700 pr-4">
                                  {formatPrice(val * closeQty)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Non-Cash & Cards Reconciliation */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-[#A7066A]" /> Non-Cash & Card Reconciliations
                </h4>
                <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/20">
                  <Table>
                    <TableHeader className="bg-slate-50/60">
                      <TableRow>
                        <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 pl-4">Payment Method</TableHead>
                        <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-right">Expected</TableHead>
                        <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-right">Actual Counted</TableHead>
                        <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 py-2 text-right pr-4">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-slate-50/40 text-xs">
                        <TableCell className="font-bold text-slate-700 py-2.5 pl-4">Credit Card</TableCell>
                        <TableCell className="text-right font-mono py-2.5 text-slate-600">{formatPrice(detailedShift.expectedCredit)}</TableCell>
                        <TableCell className="text-right font-mono py-2.5 font-bold text-slate-800">
                          {detailedShift.actualCredit !== null ? formatPrice(detailedShift.actualCredit) : "—"}
                        </TableCell>
                        <TableCell className="text-right py-2.5 pr-4">
                          <VarianceBadge value={detailedShift.creditVariance} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-slate-50/40 text-xs">
                        <TableCell className="font-bold text-slate-700 py-2.5 pl-4">Debit Card</TableCell>
                        <TableCell className="text-right font-mono py-2.5 text-slate-600">{formatPrice(detailedShift.expectedDebit)}</TableCell>
                        <TableCell className="text-right font-mono py-2.5 font-bold text-slate-800">
                          {detailedShift.actualDebit !== null ? formatPrice(detailedShift.actualDebit) : "—"}
                        </TableCell>
                        <TableCell className="text-right py-2.5 pr-4">
                          <VarianceBadge value={detailedShift.debitVariance} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-slate-50/40 text-xs">
                        <TableCell className="font-bold text-slate-700 py-2.5 pl-4">Gift Voucher</TableCell>
                        <TableCell className="text-right font-mono py-2.5 text-slate-600">{formatPrice(detailedShift.expectedGiftCard)}</TableCell>
                        <TableCell className="text-right font-mono py-2.5 font-bold text-slate-800">
                          {detailedShift.actualGiftCard !== null ? formatPrice(detailedShift.actualGiftCard) : "—"}
                        </TableCell>
                        <TableCell className="text-right py-2.5 pr-4">
                          <VarianceBadge value={detailedShift.giftCardVariance} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Audit Comments / Discrepancy Notes */}
              {detailedShift.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Discrepancy Notes / Audit Remarks
                  </h4>
                  <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                    "{detailedShift.notes}"
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-end pt-1">
                <Button
                  onClick={() => setSelectedShiftId(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 rounded-xl h-10 shadow-md"
                >
                  Close Audit View
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
