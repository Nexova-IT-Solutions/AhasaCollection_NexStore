"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowRightLeft, Calendar, Loader2, TrendingUp, TrendingDown,
  ShoppingBag, Package, FileSpreadsheet, ChevronDown, ChevronRight,
  Tag, Building2, Filter, X,
} from "lucide-react";
import { ExcelExportUtility } from "@/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/components/CurrencyProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantAggregation {
  variantLabel: string;
  totalSold: number;
  revenue: number;
  discountedValue: number;
  currentStock: number | null;
}

interface ProductRow {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  totalSold: number;
  revenue: number;
  discountedValue: number;
  hasDiscount: boolean;
  supplierName: string | null;
  supplierId: string | null;
  variants: VariantAggregation[];
  lastSuppliedAt?: string | null;
}

interface SupplierOption { id: string; name: string; }

interface MovementReportData {
  fastMoving: ProductRow[];
  nonMoving: ProductRow[];
  suppliers: SupplierOption[];
}

type DiscountStatus = "all" | "discounted" | "regular";
type StockStatus    = "all" | "in_stock" | "out_of_stock" | "low_stock";

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never supplied";

// ─── Stock badge helper ───────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)  return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Out of Stock</Badge>;
  if (stock <= 5)  return <span className="text-amber-600 font-semibold text-xs">{stock} ⚠</span>;
  return <span className="text-slate-600 text-xs">{stock}</span>;
}

// ─── Expandable Row ───────────────────────────────────────────────────────────

function ProductExpandableRow({ p, columns, fmt }: { p: ProductRow; columns: "fast" | "slow"; fmt: (val: number) => string }) {
  const [open, setOpen] = useState(false);
  const hasVariants = p.variants.length > 1 || (p.variants.length === 1 && p.variants[0].variantLabel !== "Standard");

  return (
    <>
      <TableRow className="hover:bg-slate-50/60 cursor-pointer" onClick={() => hasVariants && setOpen(o => !o)}>
        <TableCell className="font-medium text-slate-900 text-xs">
          <div className="flex items-center gap-2">
            {hasVariants
              ? open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                     : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              : <span className="w-3.5" />}
            <span>{p.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-slate-500 font-mono">{p.sku}</TableCell>
        <TableCell className="text-xs text-slate-600">
          {p.supplierName
            ? <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" />{p.supplierName}</div>
            : <span className="text-slate-300 italic">—</span>}
        </TableCell>
        {columns === "fast" ? (
          <>
            <TableCell className="text-center">
              <Badge className="bg-emerald-100 text-emerald-800 font-bold border-emerald-200">{p.totalSold} sold</Badge>
            </TableCell>
            <TableCell className="text-xs text-right"><StockBadge stock={p.stock} /></TableCell>
            <TableCell className="text-xs text-right font-black text-slate-900">{fmt(p.revenue)}</TableCell>
            <TableCell className="text-xs text-right">
              {p.discountedValue > 0
                ? <span className="text-rose-600 font-semibold">–{fmt(p.discountedValue)}</span>
                : <span className="text-slate-300">—</span>}
            </TableCell>
            <TableCell className="text-center">
              {p.hasDiscount
                ? <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold flex items-center gap-1 w-fit mx-auto"><Tag className="h-2.5 w-2.5" /> On Promo</Badge>
                : <span className="text-slate-300 text-xs">—</span>}
            </TableCell>
          </>
        ) : (
          <>
            <TableCell className="text-xs text-right"><StockBadge stock={p.stock} /></TableCell>
            <TableCell className="text-xs text-right font-medium text-slate-700">{fmt(p.price)}</TableCell>
            <TableCell className="text-xs text-center text-slate-500">{fmtDate(p.lastSuppliedAt ?? null)}</TableCell>
          </>
        )}
      </TableRow>

      {open && hasVariants && p.variants.map((v, idx) => (
        <TableRow key={idx} className="bg-slate-50/80 hover:bg-slate-100/60">
          <TableCell className="text-xs text-slate-500 pl-9">
            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{v.variantLabel}</span>
          </TableCell>
          <TableCell /><TableCell />
          {columns === "fast" ? (
            <>
              <TableCell className="text-center"><span className="text-xs text-slate-500">{v.totalSold}</span></TableCell>
              <TableCell className="text-xs text-right text-slate-500">{v.currentStock !== null ? v.currentStock : "—"}</TableCell>
              <TableCell className="text-xs text-right text-slate-600 font-medium">{fmt(v.revenue)}</TableCell>
              <TableCell className="text-xs text-right">
                {v.discountedValue > 0 ? <span className="text-rose-500">–{fmt(v.discountedValue)}</span> : <span className="text-slate-300">—</span>}
              </TableCell>
              <TableCell />
            </>
          ) : (
            <>
              <TableCell className="text-xs text-right text-slate-500">{v.currentStock !== null ? v.currentStock : "—"}</TableCell>
              <TableCell /><TableCell />
            </>
          )}
        </TableRow>
      ))}
    </>
  );
}

// ─── Inner Page (needs useSearchParams so wrapped in Suspense) ────────────────

function MovementReportInner() {
  const { formatPrice: fmt } = useCurrency();
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  // ── Read initial state from URL ──
  const now    = new Date();
  const past30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

  const [startDate,     setStartDate]     = useState(searchParams.get("startDate")     || past30.toISOString().split("T")[0]);
  const [endDate,       setEndDate]       = useState(searchParams.get("endDate")       || now.toISOString().split("T")[0]);
  const [supplierId,    setSupplierId]    = useState(searchParams.get("supplierId")    || "");
  const [discountStatus,setDiscountStatus]= useState<DiscountStatus>((searchParams.get("discountStatus") as DiscountStatus) || "all");
  const [stockStatus,   setStockStatus]   = useState<StockStatus>((searchParams.get("stockStatus") as StockStatus) || "all");

  const [data,      setData]      = useState<MovementReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Sync filters → URL ──
  const syncUrl = useCallback((overrides?: Partial<{
    startDate: string; endDate: string; supplierId: string;
    discountStatus: string; stockStatus: string;
  }>) => {
    const p = new URLSearchParams();
    p.set("startDate",      overrides?.startDate      ?? startDate);
    p.set("endDate",        overrides?.endDate        ?? endDate);
    if (overrides?.supplierId    ?? supplierId)     p.set("supplierId",     overrides?.supplierId    ?? supplierId);
    if ((overrides?.discountStatus ?? discountStatus) !== "all") p.set("discountStatus", overrides?.discountStatus ?? discountStatus);
    if ((overrides?.stockStatus    ?? stockStatus)    !== "all") p.set("stockStatus",    overrides?.stockStatus    ?? stockStatus);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [router, pathname, startDate, endDate, supplierId, discountStatus, stockStatus]);

  // ── Fetch report ──
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, limit: "30", discountStatus, stockStatus });
      if (supplierId) params.set("supplierId", supplierId);
      const res  = await fetch(`/api/admin/reports/inventory/movement?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.message || "Failed to load report"); return; }
      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, supplierId, discountStatus, stockStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Active filter count ──
  const activeFilterCount = [
    supplierId !== "",
    discountStatus !== "all",
    stockStatus !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSupplierId("");
    setDiscountStatus("all");
    setStockStatus("all");
    syncUrl({ supplierId: "", discountStatus: "all", stockStatus: "all" });
  };

  const handleGenerate = () => {
    syncUrl();
    fetchData();
  };

  // ── Excel export ──
  const handleExportExcel = async () => {
    if (!data) return;
    try {
      await ExcelExportUtility.exportToExcel({
        title: `Inventory Velocity (Fast Moving) – ${startDate} to ${endDate}`,
        filename: `Inventory_Fast_${startDate}_to_${endDate}`,
        columns: [
          { header: "Product Name",          key: "name",             type: "string" },
          { header: "SKU",                   key: "sku",              type: "string" },
          { header: "Supplier",              key: "supplierName",     type: "string" },
          { header: "Units Sold",            key: "totalSold",        type: "number",   alignment: "center" },
          { header: "Current Stock",         key: "stock",            type: "number",   alignment: "center" },
          { header: "Total Revenue",         key: "revenue",          type: "currency", alignment: "right"  },
          { header: "Discounted Value",      key: "discountedValue",  type: "currency", alignment: "right"  },
          { header: "On Promo?",             key: "hasDiscountLabel", type: "string",   alignment: "center" },
        ],
        data: (data.fastMoving || []).map(p => ({ ...p, supplierName: p.supplierName ?? "—", hasDiscountLabel: p.hasDiscount ? "Yes" : "No" })),
        includeSummaryRow: true,
      });
      await ExcelExportUtility.exportToExcel({
        title: `Inventory Velocity (Stale/Non-Moving)`,
        filename: `Inventory_Stale_${startDate}_to_${endDate}`,
        columns: [
          { header: "Product Name",    key: "name",               type: "string" },
          { header: "SKU",             key: "sku",                type: "string" },
          { header: "Supplier",        key: "supplierName",       type: "string" },
          { header: "Current Stock",   key: "stock",              type: "number",   alignment: "center" },
          { header: "Unit Price",      key: "price",              type: "currency", alignment: "right"  },
          { header: "Last Restocked",  key: "lastRestockedLabel", type: "string",   alignment: "center" },
        ],
        data: (data.nonMoving || []).map(p => ({ ...p, supplierName: p.supplierName ?? "—", lastRestockedLabel: fmtDate(p.lastSuppliedAt ?? null) })),
        includeSummaryRow: false,
      });
    } catch (err) { console.error("[ItemMovement] Export failed:", err); }
  };

  const FastHeaders = () => (
    <TableRow className="hover:bg-transparent">
      {["Product Name","SKU","Supplier","Qty Sold","Stock","Revenue","Discounted Value","Promo Flag"].map(h => (
        <TableHead key={h} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</TableHead>
      ))}
    </TableRow>
  );

  const SlowHeaders = () => (
    <TableRow className="hover:bg-transparent">
      {["Product Name","SKU","Supplier","Stock","Unit Price","Last Restocked"].map(h => (
        <TableHead key={h} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</TableHead>
      ))}
    </TableRow>
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-[#A7066A]" />
            Item Movement Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">Velocity · Discount Tracking · Supplier & Variant Breakdown</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs w-[145px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs w-[145px]" />
          </div>
          <Button onClick={handleGenerate} disabled={isLoading} size="sm" className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Generate</span>
          </Button>
          <Button onClick={handleExportExcel} disabled={!data || isLoading} variant="outline" size="sm"
            className="h-9 text-[#104E5B] hover:bg-[#E6F2F4] font-semibold">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />Export Excel
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <Filter className="h-4 w-4 text-slate-400 mt-5 shrink-0" />

        {/* Supplier dropdown */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Supplier</Label>
          <Select value={supplierId || "__all__"} onValueChange={v => setSupplierId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Suppliers</SelectItem>
              {(data?.suppliers || []).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Discount status */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Discount Status</Label>
          <Select value={discountStatus} onValueChange={v => setDiscountStatus(v as DiscountStatus)}>
            <SelectTrigger className="h-9 text-xs w-[195px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="discounted">On Promo / Discounted</SelectItem>
              <SelectItem value="regular">Regular Price Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock status */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Stock Status</Label>
          <Select value={stockStatus} onValueChange={v => setStockStatus(v as StockStatus)}>
            <SelectTrigger className="h-9 text-xs w-[175px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="in_stock">In Stock (&gt; 5)</SelectItem>
              <SelectItem value="low_stock">Low Stock (1–5)</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter pills + clear */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 pb-0.5">
            <Badge className="bg-[#A7066A]/10 text-[#A7066A] border-[#A7066A]/20 font-semibold">
              {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-800 px-2" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* ── Skeleton loader ── */}
      {isLoading && !data && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
        </div>
      )}

      {/* ── Tables ── */}
      {data && (
        <Tabs defaultValue="fast-moving" className="space-y-4">
          <TabsList className="bg-slate-100/80 p-1 rounded-xl">
            <TabsTrigger value="fast-moving" className="rounded-lg text-xs font-semibold px-4 py-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Fast Moving
              <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">{data.fastMoving.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="non-moving" className="rounded-lg text-xs font-semibold px-4 py-2 flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
              Non-Moving / Stale
              <Badge className="ml-1 bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">{data.nonMoving.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fast-moving">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />Top Performers by Order Quantity
                </CardTitle>
                <p className="text-xs text-slate-400">Click rows with multiple variants to expand variety-wise breakdown</p>
              </CardHeader>
              <CardContent>
                {data.fastMoving.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <ShoppingBag className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">No matching products found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or date range</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><FastHeaders /></TableHeader>
                      <TableBody>
                        {data.fastMoving.map(p => <ProductExpandableRow key={p.productId} p={p} columns="fast" fmt={fmt} />)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-moving">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-600" />Stale Stock Breakdown
                </CardTitle>
                <p className="text-xs text-slate-400">Products with zero sales in the selected period</p>
              </CardHeader>
              <CardContent>
                {data.nonMoving.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Package className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium">No stale items match the current filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><SlowHeaders /></TableHeader>
                      <TableBody>
                        {data.nonMoving.map(p => <ProductExpandableRow key={p.productId} p={p} columns="slow" fmt={fmt} />)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Default export wrapped in Suspense (required for useSearchParams) ─────────

export default function ItemMovementReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    }>
      <MovementReportInner />
    </Suspense>
  );
}
