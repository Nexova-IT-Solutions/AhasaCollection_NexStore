"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowRightLeft,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Package,
  Building2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TransferRecord = {
  id: string;
  productName: string;
  productSku?: string | null;
  sourceOutletName: string;
  sourceLocationName?: string;
  sourceIsRepository?: boolean;
  targetOutletName: string;
  targetLocationName?: string;
  targetIsRepository?: boolean;
  quantity: number;
  reason: string;
  performedByName: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StockTransfersReportPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const pageSize = 50;

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search) params.set("search", search);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return `/api/admin/reports/stock-transfers?${params.toString()}`;
  }, [search, page, fromDate, toDate]);

  const { data, isLoading, mutate } = useSWR<{
    transfers: TransferRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>(buildUrl(), fetcher, { keepPreviousData: true });

  const transfers = data?.transfers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate]);

  const handleExport = () => {
    const rows = [
      ["Date", "Product", "SKU", "From Outlet", "To Outlet", "Qty", "Reason", "Performed By"],
      ...transfers.map((t) => [
        formatDate(t.createdAt),
        t.productName,
        t.productSku ?? "",
        t.sourceOutletName,
        t.targetOutletName,
        String(t.quantity),
        t.reason,
        t.performedByName,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1720] flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-[#2563EB]" />
            Stock Transfer Report
          </h1>
          <p className="text-[#6B5A64] mt-1 text-sm">
            Audit log of all inter-outlet inventory transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={transfers.length === 0}
            className="gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-brand-border shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search product, SKU, reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 text-sm"
                placeholder="From"
              />
              <span className="text-slate-400 text-sm">–</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 text-sm"
                placeholder="To"
              />
            </div>
            {(search || fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFromDate("");
                  setToDate("");
                }}
                className="text-slate-500"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-brand-border shadow-sm">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B5A64] uppercase tracking-wide">
                Total Transfers
              </p>
              <p className="text-2xl font-bold text-[#1F1720]">{total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-border shadow-sm">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B5A64] uppercase tracking-wide">
                Units Moved
              </p>
              <p className="text-2xl font-bold text-[#1F1720]">
                {transfers.reduce((s, t) => s + t.quantity, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-border shadow-sm">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6B5A64] uppercase tracking-wide">
                This Page
              </p>
              <p className="text-2xl font-bold text-[#1F1720]">{transfers.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-brand-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading transfers…
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ArrowRightLeft className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No transfer records found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      From Location / Repository
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      To Outlet
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Performed By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-[#1F1720] whitespace-nowrap font-mono text-xs">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1F1720] truncate max-w-[160px]">
                          {t.productName}
                        </p>
                        {t.productSku && (
                          <p className="text-xs text-[#6B5A64] font-mono">{t.productSku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.sourceIsRepository ? (
                          <Badge
                            variant="outline"
                            className="text-purple-700 border-purple-200 bg-purple-50 gap-1 font-medium"
                          >
                            <Building2 className="w-3 h-3 text-purple-600" />
                            {t.sourceOutletName}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-600 border-slate-200 gap-1 font-medium"
                          >
                            <Building2 className="w-3 h-3" />
                            {t.sourceOutletName}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.targetIsRepository ? (
                          <Badge
                            variant="outline"
                            className="text-purple-700 border-purple-200 bg-purple-50 gap-1 font-medium"
                          >
                            <Building2 className="w-3 h-3 text-purple-600" />
                            {t.targetOutletName}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-200 bg-blue-50 gap-1 font-medium"
                          >
                            <Building2 className="w-3 h-3" />
                            {t.targetOutletName}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                          {t.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1F1720] max-w-[180px]">
                        <p className="truncate text-sm" title={t.reason}>
                          {t.reason}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[#6B5A64]">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-sm truncate max-w-[100px]">{t.performedByName}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#6B5A64]">
          <p>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
            {total.toLocaleString()} transfers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 py-1 rounded-md border border-brand-border bg-white text-xs font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
