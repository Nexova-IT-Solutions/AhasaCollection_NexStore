"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw,
  User,
  Clock,
  Banknote,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  X,
  CreditCard,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReusablePagination } from "@/components/admin/reusable-pagination";

interface DenominationItem {
  value: number;
  label: string;
  type: "NOTE" | "COIN";
  count: number;
  total: number;
}

interface Shift {
  id: string;
  operatorId: string;
  operatorName: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  expectedCash: number;
  actualCash: number | null;
  expectedCredit: number;
  actualCredit: number | null;
  cashVariance: number | null;
  creditVariance: number | null;
  status: "OPEN" | "CLOSED";
  notes: string | null;
  totalOrders: number;
  denomination: DenominationItem[] | null;
  createdAt: string;
}

const formatPrice = (price: number) =>
  `Rs. ${price.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

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

export default function ShiftsPage() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1") || 1;
  const limit = parseInt(searchParams.get("limit") || "10") || 10;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [operatorSearch, setOperatorSearch] = useState<string>("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected shift for detailed view
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      
      const res = await fetch(`/api/admin/pos/shifts?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch shifts");
      }

      // Filter locally for operator search if entered (API supports operatorId, locally filtering by name is cleaner for search inputs)
      let resultShifts = data.shifts || [];
      if (operatorSearch.trim() !== "") {
        resultShifts = resultShifts.filter((s: Shift) =>
          s.operatorName.toLowerCase().includes(operatorSearch.toLowerCase())
        );
      }

      setShifts(resultShifts);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while loading shifts");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, operatorSearch]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Derived stats
  const activeShiftsCount = shifts.filter((s) => s.status === "OPEN").length;
  const netVariance = shifts.reduce((sum, s) => sum + (s.cashVariance || 0), 0);
  const totalOrdersCount = shifts.reduce((sum, s) => sum + s.totalOrders, 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* ─── Top Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="text-[#A7066A] hover:text-[#8A0558] flex items-center gap-1.5 text-sm font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#1F1720] tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-pink-100 rounded-2xl text-[#A7066A] inline-flex">
              <RefreshCcw className="w-6 h-6 animate-spin-slow" />
            </div>
            POS Shifts Ledger
          </h1>
          <p className="text-[#6B5A64] max-w-2xl font-medium">
            Monitor terminal sessions, review operator activity, and audit cash drawer reconciliations.
          </p>
        </div>

        <Button 
          onClick={fetchShifts}
          disabled={loading}
          variant="outline"
          className="border-brand-border text-slate-700 rounded-full px-6 hover:bg-slate-50 transition-all font-bold h-11"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* ─── Premium Tab Navigation ─── */}
      <div className="bg-slate-100/60 p-1.5 rounded-2xl inline-flex border border-slate-200/80 shadow-inner">
        <Link
          href="/admin/pos/shifts"
          className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 bg-white text-[#A7066A] shadow-sm scale-105"
        >
          Shift Sessions
        </Link>
        <Link
          href="/admin/reports/cash-close"
          className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 text-[#6B5A64] hover:text-[#1F1720]"
        >
          Reconciliation & EOD Reports
        </Link>
      </div>

      {/* ─── Modern Glassmorphic KPI Dashboard ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Sessions */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-white hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <Clock className="h-6 w-6" />
              </div>
              <Badge className="bg-slate-100 text-slate-700 border-none font-bold">Total</Badge>
            </div>
            <p className="text-xs font-black text-[#6B5A64] uppercase tracking-wider">
              Shift Records
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {totalCount}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Registered POS shifts log
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50/60 to-white hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-none font-bold">Live</Badge>
            </div>
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
              Active Shifts
            </p>
            <p className="text-3xl font-black text-amber-700 mt-1">
              {activeShiftsCount}
            </p>
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Currently open registers
            </p>
          </CardContent>
        </Card>

        {/* Cash Variance audit */}
        <Card className={`border-0 shadow-md bg-gradient-to-br hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden ${
          netVariance >= 0 ? "from-emerald-50/60 to-white" : "from-rose-50/60 to-white"
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${
                netVariance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                <Banknote className="h-6 w-6" />
              </div>
              <Badge className={
                netVariance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }>
                Variance
              </Badge>
            </div>
            <p className="text-xs font-black text-[#6B5A64] uppercase tracking-wider">
              Page Net Variance
            </p>
            <p className={`text-2xl font-black mt-1 ${
              netVariance >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}>
              {netVariance >= 0 ? "+" : ""}
              {formatPrice(netVariance)}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Sum of visible reconciliation
            </p>
          </CardContent>
        </Card>

        {/* Total Orders processed */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/60 to-white hover:shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                <FileText className="h-6 w-6" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-none font-bold">POS</Badge>
            </div>
            <p className="text-xs font-black text-[#6B5A64] uppercase tracking-wider">
              Orders Logged
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {totalOrdersCount}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Transactions processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="bg-white p-5 rounded-[2rem] border border-brand-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by operator name..."
            value={operatorSearch}
            onChange={(e) => {
              setOperatorSearch(e.target.value);
            }}
            className="pl-12 rounded-2xl h-11 bg-slate-50 border-brand-border focus:ring-[#A7066A] text-slate-700 placeholder-slate-400 font-medium"
          />
        </div>

        {/* Status Filter Tab-like buttons */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
          {["ALL", "OPEN", "CLOSED"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
              }}
              className={`flex-1 md:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                statusFilter === status
                  ? "bg-white text-[#A7066A] shadow-sm scale-105"
                  : "text-[#6B5A64] hover:text-[#1F1720]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Shifts Registry Table ─── */}
      <Card className="border-0 shadow-md rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          
          {loading && shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <RefreshCcw className="h-10 w-10 animate-spin text-[#A7066A]" />
              <p className="font-bold text-slate-500">Querying Shifts Ledger...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-rose-500 font-bold space-y-2">
              <AlertTriangle className="h-10 w-10 mx-auto" />
              <p>{error}</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="h-14 w-14 mb-4 stroke-1 text-slate-300" />
              <p className="text-lg font-bold text-slate-700">No shift records found</p>
              <p className="text-sm mt-1 text-slate-500">No shifts match the active search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-brand-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 pl-8">
                      Operator
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4">
                      Shift Started
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4">
                      Shift Closed
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-right">
                      Starting Cash
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-right">
                      Expected Cash
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-right">
                      Actual Drawer Cash
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-right">
                      Net Variance
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-center">
                      Orders
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-black text-[#6B5A64] uppercase tracking-wider py-4 text-center pr-8">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => {
                    const hasNegativeVariance = shift.cashVariance !== null && shift.cashVariance < -0.01;
                    const hasPositiveVariance = shift.cashVariance !== null && shift.cashVariance > 0.01;
                    const isPerfectReconciliation = shift.cashVariance !== null && Math.abs(shift.cashVariance) <= 0.01;

                    return (
                      <TableRow
                        key={shift.id}
                        className={`transition-colors hover:bg-slate-50/80 border-b border-gray-100 ${
                          hasNegativeVariance
                            ? "bg-rose-50/30 hover:bg-rose-50/50"
                            : hasPositiveVariance
                            ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                            : ""
                        }`}
                      >
                        <TableCell className="pl-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FCEAF4] flex items-center justify-center text-[#A7066A] font-bold">
                              {shift.operatorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-800 block">
                                {shift.operatorName}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 font-mono">
                                ID: {shift.operatorId.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-xs font-bold text-slate-700">
                            {formatDate(shift.startTime)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {formatTime(shift.startTime)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {shift.endTime ? (
                            <>
                              <div className="text-xs font-bold text-slate-700">
                                {formatDate(shift.endTime)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime(shift.endTime)}
                              </div>
                            </>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-black uppercase tracking-wider">
                              Open/Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs font-bold text-slate-600">
                          {formatPrice(shift.startingCash)}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs font-bold text-slate-800">
                          {formatPrice(shift.expectedCash)}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs font-black text-slate-800">
                          {shift.actualCash !== null ? (
                            formatPrice(shift.actualCash)
                          ) : (
                            <span className="text-slate-300 font-normal italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-xs">
                          {shift.cashVariance !== null ? (
                            <span className={`font-black ${
                              isPerfectReconciliation
                                ? "text-slate-600"
                                : hasPositiveVariance
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}>
                              {hasPositiveVariance ? "+" : ""}
                              {formatPrice(shift.cashVariance)}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Badge variant="outline" className="rounded-lg text-[10px] font-black bg-gray-50 border-gray-200">
                            {shift.totalOrders} orders
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          {shift.status === "CLOSED" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black uppercase tracking-wider">
                              Closed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-none text-[10px] font-black uppercase tracking-wider animate-pulse">
                              Open
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-center pr-8">
                          <Button
                            onClick={() => {
                              setSelectedShift(shift);
                              setIsDetailOpen(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl hover:bg-pink-50 hover:text-[#A7066A] font-bold text-slate-600 transition-colors gap-1 h-9 px-3"
                          >
                            <Eye className="w-4 h-4" />
                            Audit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Reusable Pagination Controls */}
          <ReusablePagination 
            totalItems={totalCount}
            itemsPerPage={limit}
            currentPage={page}
            pageParamKey="page"
            limitParamKey="limit"
          />
        </CardContent>
      </Card>

      {/* ─── Shift Detail Audit Dialog ─── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[3rem] border-none shadow-2xl animate-in zoom-in duration-300">
          {selectedShift && (
            <>
              <DialogHeader className="p-8 pb-4 bg-white sticky top-0 z-10 flex flex-row items-center justify-between border-b border-gray-50">
                <div>
                  <DialogTitle className="text-2xl font-black text-[#1F1720] tracking-tight">
                    Shift Audit Reconciliation
                  </DialogTitle>
                  <DialogDescription className="text-[#6B5A64] font-medium mt-1">
                    Verify POS drawer cash, card receipts, and denomination breakdown.
                  </DialogDescription>
                </div>
                <Button 
                  onClick={() => setIsDetailOpen(false)}
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                
                {/* 1. Header Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/50">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#6B5A64] tracking-widest block">Operator</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-[#A7066A] font-bold text-xs">
                        {selectedShift.operatorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-black text-slate-800">{selectedShift.operatorName}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#6B5A64] tracking-widest block">Status</span>
                    <Badge className={
                      selectedShift.status === "CLOSED" 
                        ? "bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase tracking-wider"
                        : "bg-amber-100 text-amber-700 border-none text-[9px] font-black uppercase tracking-wider"
                    }>
                      {selectedShift.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#6B5A64] tracking-widest block">Started At</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedShift.startTime)} @ {formatTime(selectedShift.startTime)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#6B5A64] tracking-widest block">Ended At</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {selectedShift.endTime ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(selectedShift.endTime)} @ {formatTime(selectedShift.endTime)}
                        </>
                      ) : (
                        <span className="text-amber-600 font-bold italic">Shift is open</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* 2. Audit Summary Sheet */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A7066A]" />
                    Audit Summary Sheet
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cash drawer summary */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <h4 className="text-xs font-black text-slate-800 border-b pb-2 flex justify-between">
                        <span>Cash Reconciliation</span>
                        <span className="font-mono text-[10px] text-slate-400">LKR</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Starting Drawer Cash</span>
                          <span className="font-bold font-mono text-slate-700">{formatPrice(selectedShift.startingCash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Expected Drawer Cash</span>
                          <span className="font-bold font-mono text-slate-800">{formatPrice(selectedShift.expectedCash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Actual Drawer Cash</span>
                          <span className="font-black font-mono text-slate-800">
                            {selectedShift.actualCash !== null ? formatPrice(selectedShift.actualCash) : "Pending"}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-dashed pt-2">
                          <span className="font-black text-slate-800">Drawer Variance</span>
                          {selectedShift.cashVariance !== null ? (
                            <span className={`font-black font-mono ${
                              Math.abs(selectedShift.cashVariance) < 0.01
                                ? "text-slate-600"
                                : selectedShift.cashVariance > 0
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}>
                              {selectedShift.cashVariance > 0 ? "+" : ""}
                              {formatPrice(selectedShift.cashVariance)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card and transaction summary */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <h4 className="text-xs font-black text-slate-800 border-b pb-2 flex justify-between">
                        <span>Card & Orders Summary</span>
                        <span className="font-mono text-[10px] text-slate-400">LKR</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Expected Card Sales</span>
                          <span className="font-bold font-mono text-slate-700">
                            {formatPrice(selectedShift.expectedCredit || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Actual Card Sales</span>
                          <span className="font-bold font-mono text-slate-800">
                            {selectedShift.actualCredit !== null ? formatPrice(selectedShift.actualCredit) : "Pending"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Processed Orders</span>
                          <span className="font-black font-mono text-purple-700">
                            {selectedShift.totalOrders} Orders
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-dashed pt-2">
                          <span className="font-black text-slate-800">Card Variance</span>
                          {selectedShift.creditVariance !== null ? (
                            <span className={`font-black font-mono ${
                              Math.abs(selectedShift.creditVariance) < 0.01
                                ? "text-slate-600"
                                : selectedShift.creditVariance > 0
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}>
                              {selectedShift.creditVariance > 0 ? "+" : ""}
                              {formatPrice(selectedShift.creditVariance)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Currency Denomination breakdown if closed */}
                {selectedShift.denomination && selectedShift.denomination.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#A7066A]" />
                      Denomination Break Sheet
                    </h3>
                    
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-[#6B5A64] py-2.5 pl-6">Value</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-[#6B5A64] py-2.5 text-center">Type</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-[#6B5A64] py-2.5 text-center">Bill Count</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-[#6B5A64] py-2.5 text-right pr-6">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedShift.denomination.map((denom, i) => (
                            <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="py-2.5 pl-6 font-bold text-xs text-slate-800">
                                {formatPrice(denom.value)}
                              </TableCell>
                              <TableCell className="py-2.5 text-center">
                                <Badge className={`text-[9px] font-black uppercase tracking-wider border-none ${
                                  denom.type === "NOTE" 
                                    ? "bg-blue-50 text-blue-700" 
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                  {denom.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 text-center font-bold text-xs text-slate-700">
                                {denom.count}
                              </TableCell>
                              <TableCell className="py-2.5 text-right pr-6 font-mono font-bold text-xs text-slate-800">
                                {formatPrice(denom.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* 4. Shift Notes */}
                {selectedShift.notes && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#A7066A]" />
                      Operator Audit Notes
                    </h3>
                    <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 text-xs font-bold text-slate-700 leading-relaxed italic">
                      "{selectedShift.notes}"
                    </div>
                  </div>
                )}

              </div>
              
              <div className="p-8 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-10 flex justify-end">
                <Button 
                  onClick={() => setIsDetailOpen(false)}
                  className="bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-full px-12 h-11 font-black shadow-lg shadow-[#A7066A]/20 transition-all"
                >
                  Conclude Audit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
