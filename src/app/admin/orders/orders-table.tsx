"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, MoreHorizontal, Search, SearchX, FilterX, PackageSearch, FileSpreadsheet } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { ReusablePagination } from "@/components/admin/reusable-pagination";
import { ExcelExportUtility } from "@/utils/excel-export";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

import { useCurrency } from "@/components/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  ADMIN_ORDER_STATUS_OPTIONS,
  ADMIN_PAYMENT_STATUS_OPTIONS,
  formatCurrency,
  formatOrderStatusLabel,
} from "@/lib/admin-orders";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { useToast } from "@/hooks/use-toast";

type OrdersTableProps = {
  locale: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    itemsCount: number;
    types: string[];
  }>;
  totalCount: number;
  currentUserRole?: string;
};

export function OrdersTable({ locale, orders, totalCount, currentUserRole = "ADMIN" }: OrdersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [localOrders, setLocalOrders] = useState(orders);
  useEffect(() => setLocalOrders(orders), [orders]);

  const { data: toggles } = useSWR<Record<string, boolean>>(
    "/api/admin/feature-toggles",
    fetcher
  );
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;

  const handleExportOrders = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Sales Orders Registry",
        filename: "Orders_Export",
        columns: [
          { header: "Order Number", key: "orderNumber", type: "string" },
          { header: "Created Date", key: "createdAt", type: "date" },
          { header: "Customer Name", key: "customerName", type: "string" },
          { header: "Customer Email", key: "customerEmail", type: "string" },
          { header: "Items Count", key: "itemsCount", type: "number", alignment: "center" },
          { header: "Order Content Types", key: "types", type: "string" },
          { header: "Payment Status", key: "paymentStatus", type: "string", alignment: "center" },
          { header: "Order Status", key: "orderStatus", type: "string", alignment: "center" },
          { header: "Total Value", key: "total", type: "currency", alignment: "right" },
        ],
        data: localOrders.map(order => ({
          ...order,
          types: order.types.map(t => t === "DIGITAL" ? "Digital" : t === "PAPER" ? "Paper" : "Standard").join(", ")
        })),
        includeSummaryRow: true,
      });
      toast({
        title: "Success",
        description: "Orders Excel report downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export orders.",
        variant: "destructive",
      });
    }
  };

  const [queryState, setQueryState] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      status: parseAsString.withDefault(""),
      payment: parseAsString.withDefault(""),
      type: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(ADMIN_ORDERS_PAGE_SIZE),
    },
    {
      clearOnDefault: true,
      history: "replace",
      shallow: false,
    }
  );

  const [searchInput, setSearchInput] = useState(queryState.q);
  const [updating, setUpdating] = useState<{
    orderId: string;
    type: "orderStatus" | "paymentStatus";
  } | null>(null);

  const quickOrderStatuses = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  const quickPaymentStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;

  const getValidOrderStatuses = () => {
    return quickOrderStatuses as unknown as string[];
  };

  const getValidPaymentStatuses = () => {
    return quickPaymentStatuses as unknown as string[];
  };

  useEffect(() => {
    setSearchInput(queryState.q);
  }, [queryState.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === queryState.q) return;

      void setQueryState({ q: nextSearch || null, page: 1 });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [queryState.q, searchInput, setQueryState]);

  const hasSearch = queryState.q.trim().length > 0;
  const hasFilters = Boolean(queryState.status || queryState.payment || queryState.type);
  const totalPages = Math.max(1, Math.ceil(totalCount / queryState.limit));
  const currentPage = Math.min(Math.max(queryState.page, 1), totalPages);
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * queryState.limit + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * queryState.limit, totalCount);

  const activeSummary = useMemo(() => {
    const parts: string[] = [];
    if (hasSearch) parts.push(`search: "${queryState.q}"`);
    if (queryState.status) parts.push(`status: ${queryState.status}`);
    if (queryState.payment) parts.push(`payment: ${queryState.payment}`);
    if (queryState.type) parts.push(`type: ${queryState.type}`);
    return parts.join(" • ");
  }, [hasSearch, queryState.payment, queryState.q, queryState.status]);

  const clearSearch = () => void setQueryState({ q: null, page: 1 });
  const clearFilters = () => void setQueryState({ status: null, payment: null, type: null, page: 1 });
  const clearAll = () => void setQueryState({ q: null, status: null, payment: null, type: null, page: 1 });

  const setStatus = (value: string) => void setQueryState({ status: value === "all" ? null : value, page: 1 });
  const setPayment = (value: string) => void setQueryState({ payment: value === "all" ? null : value, page: 1 });
  const setType = (value: string) => void setQueryState({ type: value === "all" ? null : value, page: 1 });

  const handleStatusChange = async (
    orderId: string,
    type: "orderStatus" | "paymentStatus",
    newStatus: string,
    currentStatus: string
  ) => {
    if (newStatus === currentStatus) return;

    // Optimistic Update
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [type]: newStatus } : o))
    );
    setUpdating({ orderId, type });

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [type]: newStatus }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to update order status");
      }

      toast({
        title: "Updated",
        description: `${type === "orderStatus" ? "Order" : "Payment"} status updated to ${formatOrderStatusLabel(newStatus)}.`,
      });

      router.refresh();
    } catch (error: any) {
      // Revert Optimistic Update on failure
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, [type]: currentStatus } : o))
      );
      toast({
        title: "Update failed",
        description: error?.message || "Could not update status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const emptyState = (() => {
    if (totalCount > 0) return null;

    if (hasSearch) {
      return {
        icon: SearchX,
        title: `No results for “${queryState.q}”`,
        description: "Try a different order number, customer name, or email address.",
        action: <Button onClick={clearSearch}>Clear Search</Button>,
      };
    }

    if (hasFilters) {
      return {
        icon: FilterX,
        title: "No results for the selected filters",
        description: "Try a different order status or payment status.",
        action: <Button onClick={clearFilters}>Clear Filters</Button>,
      };
    }

    return {
      icon: PackageSearch,
      title: "No orders exist yet",
      description: "Orders will appear here once customers start checking out.",
      action: null,
    };
  })();

  return (
    <Card className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative" suppressHydrationWarning>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by order number, customer name, or email"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
                className="h-11 rounded-xl border-brand-border pl-10"
              />
            </div>

            <Select value={queryState.status || "all"} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full rounded-xl border-brand-border">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Order Statuses</SelectItem>
                {ADMIN_ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={queryState.payment || "all"} onValueChange={setPayment}>
              <SelectTrigger className="h-11 w-full rounded-xl border-brand-border">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Statuses</SelectItem>
                {ADMIN_PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


          </div>

          <Button
            onClick={handleExportOrders}
            variant="outline"
            className="h-11 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        {activeSummary ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand-border bg-slate-50 px-4 py-3 text-sm text-[#6B5A64]">
            <span>{activeSummary}</span>
            <Button variant="ghost" className="h-8 rounded-full px-3 text-[#A7066A] hover:bg-[#FCEAF4]" onClick={clearAll}>
              Clear All
            </Button>
          </div>
        ) : null}

        {orders.length > 0 ? (
          <>
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-150 sticky top-0 z-10 shadow-[0_1px_0_0_#e5e7eb]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Order #</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Items</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Total Value</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Payment</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localOrders.map((order) => {
                  const validPaymentStatuses = getValidPaymentStatuses();
                  const validOrderStatuses = getValidOrderStatuses();

                  return (
                    <TableRow key={order.id} className="even:bg-gray-50/40 hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                      <TableCell className="py-4 px-6 font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</TableCell>
                      <TableCell className="py-4 px-6 text-slate-500 font-medium text-sm">{formatDate(order.createdAt)}</TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-gray-900 text-sm">{order.customerName}</p>
                          <p className="text-xs text-slate-500 font-medium">{order.customerEmail || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {order.types.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                t === "DIGITAL" && "border-pink-200 bg-pink-50 text-pink-600",
                                t === "PAPER" && "border-indigo-200 bg-indigo-50 text-indigo-600",
                                t === "STANDARD" && "border-slate-200 bg-slate-50 text-slate-600"
                              )}
                            >
                              {t === "DIGITAL" ? "Digital" : t === "PAPER" ? "Paper" : "Standard"}
                            </Badge>
                          ))}
                          {order.types.length > 1 && (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border-orange-100">
                              Mixed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 font-semibold text-gray-900 text-sm">{formatPrice(order.total)}</TableCell>
                      <TableCell className="py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild disabled={!isWebsiteEnabled || validPaymentStatuses.length === 0 || Boolean(updating && updating.orderId === order.id)}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7066A]/30 disabled:cursor-not-allowed"
                            >
                              <OrderStatusBadge status={order.paymentStatus} type="PAYMENT" showChevron={validPaymentStatuses.length > 0} className={validPaymentStatuses.length > 0 ? "cursor-pointer hover:opacity-90" : ""} />
                              {updating?.orderId === order.id && updating?.type === "paymentStatus" ? <Loader2 className="size-3.5 animate-spin text-[#A7066A]" /> : null}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-xl border-brand-border">
                            {validPaymentStatuses.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                disabled={Boolean(updating && updating.orderId === order.id)}
                                onClick={() => void handleStatusChange(order.id, "paymentStatus", status, order.paymentStatus)}
                              >
                                {formatOrderStatusLabel(status)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild disabled={!isWebsiteEnabled || validOrderStatuses.length === 0 || Boolean(updating && updating.orderId === order.id)}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7066A]/30 disabled:cursor-not-allowed"
                            >
                              <OrderStatusBadge status={order.orderStatus} type="ORDER" showChevron={validOrderStatuses.length > 0} className={validOrderStatuses.length > 0 ? "cursor-pointer hover:opacity-90" : ""} />
                              {updating?.orderId === order.id && updating?.type === "orderStatus" ? <Loader2 className="size-3.5 animate-spin text-[#A7066A]" /> : null}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-xl border-brand-border">
                            {validOrderStatuses.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                disabled={Boolean(updating && updating.orderId === order.id)}
                                onClick={() => void handleStatusChange(order.id, "orderStatus", status, order.orderStatus)}
                              >
                                {formatOrderStatusLabel(status)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-full">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open order actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl border-brand-border">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-2">
                                <Eye className="size-4" />
                                <span>View Details</span>
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="border-t border-brand-border mt-4 overflow-hidden rounded-2xl">
              <ReusablePagination
                totalItems={totalCount}
                itemsPerPage={queryState.limit}
                currentPage={currentPage}
                pageParamKey="page"
                limitParamKey="limit"
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={emptyState!.icon}
            title={emptyState!.title}
            description={emptyState!.description}
            action={emptyState!.action}
          />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-slate-50 px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-[#A7066A] shadow-sm">
        <Icon className="size-7" />
      </div>
      <h3 className="text-xl font-bold text-[#1F1720]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[#6B5A64]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
