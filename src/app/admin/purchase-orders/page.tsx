"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Download,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertTriangle,
  ChevronRight,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from "swr";
import { useCurrency } from "@/components/CurrencyProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  PENDING_APPROVAL: {
    label: "Pending Approval",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    icon: XCircle,
  },
  GOODS_RECEIVED: {
    label: "Goods Received",
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    icon: PackageCheck,
  },
  REVIEWING: {
    label: "Reviewing Intake",
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
    icon: AlertTriangle,
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-600",
    icon: XCircle,
  },
};

export default function PurchaseOrdersPage() {
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [page, setPage] = useState(1);

  const pageSize = 20;

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (selectedTab !== "ALL") params.set("status", selectedTab);
    if (search) params.set("search", search);
    return `/api/admin/purchase-orders?${params.toString()}`;
  }, [page, selectedTab, search]);

  const { data, isLoading, mutate } = useSWR<{
    purchaseOrders: any[];
    total: number;
    page: number;
    pageSize: number;
  }>(buildUrl(), fetcher, { keepPreviousData: true });

  const purchaseOrders = data?.purchaseOrders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 p-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1720] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#A7066A]" />
            Purchase Order Management
          </h1>
          <p className="text-[#6B5A64] mt-1 text-sm">
            Create, approve, track, and intake supplier stock purchases.
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
          <Link href="/admin/purchase-orders/new">
            <Button size="sm" className="gap-1.5 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold">
              <Plus className="w-4 h-4" />
              New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs
          defaultValue="ALL"
          value={selectedTab}
          onValueChange={(val) => {
            setSelectedTab(val);
            setPage(1);
          }}
          className="w-full md:w-auto"
        >
          <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap h-auto">
            <TabsTrigger value="ALL" className="rounded-lg text-xs font-semibold px-3 py-1.5">
              All Orders
            </TabsTrigger>
            <TabsTrigger value="PENDING_APPROVAL" className="rounded-lg text-xs font-semibold px-3 py-1.5 text-amber-700">
              Pending Approval
            </TabsTrigger>
            <TabsTrigger value="APPROVED" className="rounded-lg text-xs font-semibold px-3 py-1.5 text-blue-700">
              Approved
            </TabsTrigger>
            <TabsTrigger value="GOODS_RECEIVED" className="rounded-lg text-xs font-semibold px-3 py-1.5 text-indigo-700">
              Goods Received
            </TabsTrigger>
            <TabsTrigger value="REVIEWING" className="rounded-lg text-xs font-semibold px-3 py-1.5 text-purple-700">
              Intake Review
            </TabsTrigger>
            <TabsTrigger value="COMPLETED" className="rounded-lg text-xs font-semibold px-3 py-1.5 text-emerald-700">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search PO #, supplier, requester…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-brand-border shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading purchase orders…
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">No purchase orders found</p>
              <p className="text-sm mt-1">Try adjusting your status tab or search filter</p>
              <Link href="/admin/purchase-orders/new" className="mt-4">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create First Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      PO Request #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Date & Requester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Branch / Warehouse
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Priority / Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Est. Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50">
                  {purchaseOrders.map((po) => {
                    const statusConfig = STATUS_BADGES[po.status] || {
                      label: po.status,
                      bg: "bg-slate-100 border-slate-200",
                      text: "text-slate-700",
                      icon: Clock,
                    };
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-3.5 font-bold font-mono text-[#1F1720]">
                          <Link
                            href={`/admin/purchase-orders/${po.id}`}
                            className="text-[#A7066A] hover:underline flex items-center gap-1"
                          >
                            {po.poNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#1F1720] text-xs">
                            {new Date(po.requestDate).toLocaleDateString("en-GB")}
                          </p>
                          <p className="text-[11px] text-[#6B5A64] truncate max-w-[140px]">
                            {po.requestedByName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-[#1F1720] truncate max-w-[180px]">
                              {po.supplier?.name || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                          {po.outletName || "Main Warehouse"}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${
                                po.priority === "URGENT"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : po.priority === "HIGH"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {po.priority}
                            </Badge>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {po.requestType?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#1F1720]">
                          {formatPrice(po.finalCost ?? po.totalEstimatedCost)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            variant="outline"
                            className={`gap-1 font-semibold text-xs py-1 px-2.5 ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/purchase-orders/${po.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold text-[#A7066A]">
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                            </Link>
                            {po.status === "APPROVED" && (
                              <a
                                href={`/api/admin/purchase-orders/${po.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                  <Download className="w-3.5 h-3.5" />
                                  PDF
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} orders
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
