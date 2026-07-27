"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Percent,
  BarChart3,
  Loader2,
  Calendar,
  CreditCard,
  Store,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ExcelExportUtility } from "@/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesSummaryData {
  summary: {
    totalSales: number;
    totalCostOfSales: number;
    totalDiscounts: number;
    totalGiftCardDeductions: number;
    netProfit: number;
    grossMarginPercent: number;
    orderCount: number;
    avgOrderValue: number;
  };
  dailySales: Array<{
    date: string;
    revenue: number;
    orders: number;
    cost: number;
    discounts: number;
    profit: number;
  }>;
  salesByPaymentMethod: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  salesBySource: {
    web: { total: number; orders: number };
    pos: { total: number; orders: number };
  };
  storefrontEnabled: boolean;
}

import { useCurrency } from "@/components/CurrencyProvider";

const formatMethod = (method: string) => {
  const map: Record<string, string> = {
    COD: "Cash on Delivery",
    DIRECTPAY: "DirectPay",
    MINTPAY: "MintPay",
    BANK_TRANSFER: "Bank Transfer",
    GIFT_CARD: "Gift Card",
    POS_CASH: "POS Cash",
    POS_CARD: "POS Card",
    POS_GIFT_CARD: "POS Gift Card",
    POS_SPLIT: "POS Split",
  };
  return map[method] || method;
};

export default function SalesSummaryPage() {
  const { data: session, status } = useSession();
  const { formatPrice, symbol } = useCurrency();
  const router = useRouter();

  const [data, setData] = useState<SalesSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to today
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Sales Summary Report",
        filename: `Sales_Summary_${startDate}_to_${endDate}`,
        columns: [
          { header: "Date", key: "date", type: "string" },
          { header: "Revenue (LKR)", key: "revenue", type: "currency", alignment: "right" },
          { header: "Orders", key: "orders", type: "number", alignment: "center" },
          { header: "Cost of Sales (LKR)", key: "cost", type: "currency", alignment: "right" },
          { header: "Discounts (LKR)", key: "discounts", type: "currency", alignment: "right" },
          { header: "Net Profit (LKR)", key: "profit", type: "currency", alignment: "right" },
        ],
        data: data.dailySales || [],
        includeSummaryRow: true,
      });
    } catch (err) {
      console.error("[SalesSummary] Export failed:", err);
    }
  };

  // Client-side authentication and granular permission guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !hasPermission(session, "reports.sales_summary")) {
      router.push("/admin");
    }
  }, [session, status, router]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/reports/sales-summary?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load report");
        return;
      }

      setData(json);
    } catch (err) {
      console.error("[SalesSummary] Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  if (!session || !hasPermission(session, "reports.sales_summary")) {
    return null;
  }

  const maxRevenue = data?.dailySales
    ? Math.max(...data.dailySales.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales Summary
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Revenue, costs, and profit analysis
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs w-[150px]"
            />
          </div>
          <Button
            onClick={fetchData}
            disabled={isLoading}
            size="sm"
            className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white"
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
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
        </div>
      )}

      {/* Data Content */}
      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  >
                    {data?.summary?.orderCount ?? 0} orders
                  </Badge>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Sales
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {formatPrice(data?.summary?.totalSales ?? 0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Avg. {formatPrice(data?.summary?.avgOrderValue ?? 0)} per order
                </p>
              </CardContent>
            </Card>

            {/* Cost of Sales */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-amber-700" />
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cost of Sales
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {formatPrice(data?.summary?.totalCostOfSales ?? 0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  From product cost prices
                </p>
              </CardContent>
            </Card>

            {/* Total Discounts */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-rose-100 rounded-xl">
                    <Percent className="h-5 w-5 text-rose-700" />
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Discounts
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {formatPrice(data?.summary?.totalDiscounts ?? 0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Gift cards: {formatPrice(data?.summary?.totalGiftCardDeductions ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className={`border-0 shadow-md bg-gradient-to-br ${
              (data?.summary?.netProfit ?? 0) >= 0 ? "from-blue-50 to-white" : "from-red-50 to-white"
            }`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${
                    (data?.summary?.netProfit ?? 0) >= 0 ? "bg-blue-100" : "bg-red-100"
                  }`}>
                    {(data?.summary?.netProfit ?? 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-700" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-700" />
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      (data?.summary?.netProfit ?? 0) >= 0
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {data?.summary?.grossMarginPercent ?? 0}% margin
                  </Badge>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Net Profit
                </p>
                <p className={`text-2xl font-black mt-1 tracking-tight ${
                  (data?.summary?.netProfit ?? 0) >= 0 ? "text-blue-700" : "text-red-700"
                }`}>
                  {formatPrice(data?.summary?.netProfit ?? 0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Revenue minus cost of sales
                </p>
              </CardContent>
            </Card>
          </div>
          {/* Sales by Source (Web vs POS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {data.storefrontEnabled && (
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#A7066A]" />
                    Sales by Channel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Web */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">Online / Web</span>
                        <span className="font-bold text-slate-900">
                          {formatPrice(data?.salesBySource?.web?.total ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              (data?.summary?.totalSales ?? 0) > 0
                                ? ((data?.salesBySource?.web?.total ?? 0) / data.summary.totalSales) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {data?.salesBySource?.web?.orders ?? 0} orders
                      </p>
                    </div>
                  </div>

                  {/* POS */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#A7066A]/10 rounded-lg">
                      <Store className="h-4 w-4 text-[#A7066A]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">In-Store / POS</span>
                        <span className="font-bold text-slate-900">
                          {formatPrice(data?.salesBySource?.pos?.total ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#A7066A] rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              (data?.summary?.totalSales ?? 0) > 0
                                ? ((data?.salesBySource?.pos?.total ?? 0) / data.summary.totalSales) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {data?.salesBySource?.pos?.orders ?? 0} orders
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Breakdown */}
            <Card className={`border-0 shadow-md ${data.storefrontEnabled ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#A7066A]" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.salesByPaymentMethod || data.salesByPaymentMethod.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No payment data for this period
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.salesByPaymentMethod.map((pm) => {
                      const pct =
                        (data?.summary?.totalSales ?? 0) > 0
                          ? (pm.total / data.summary.totalSales) * 100
                          : 0;
                      return (
                        <div key={pm.method} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-28 truncate font-medium">
                            {formatMethod(pm.method)}
                          </span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#A7066A] to-[#D4349E] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 w-28 text-right">
                            {formatPrice(pm.total)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] min-w-[36px] justify-center"
                          >
                            {pm.count}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Trend — Recharts Multi-Series */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#A7066A]" />
                Daily Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.dailySales || data.dailySales.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  No sales data for this period
                </p>
              ) : data.dailySales.length <= 31 ? (
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={data.dailySales}
                      margin={{ top: 10, right: 10, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(val) => {
                          return new Date(val + "T00:00:00").toLocaleDateString("en-US", { day: "numeric" });
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => formatPrice(val)}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        formatter={(value: number) => [formatPrice(value), '']}
                        labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar name="Total Sales" dataKey="revenue" fill="#A7066A" radius={[2, 2, 0, 0]} />
                      <Bar name="Cost of Sales" dataKey="cost" fill="#d97706" radius={[2, 2, 0, 0]} />
                      <Bar name="Net Profit" dataKey="profit" fill="#0369a1" radius={[2, 2, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Table fallback for large date ranges */
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">Revenue</TableHead>
                        <TableHead className="text-xs text-right">Orders</TableHead>
                        <TableHead className="text-xs text-right">Cost</TableHead>
                        <TableHead className="text-xs text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailySales.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="text-xs font-medium">
                            {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-emerald-700">
                            {formatPrice(day.revenue)}
                          </TableCell>
                          <TableCell className="text-xs text-right">{day.orders}</TableCell>
                          <TableCell className="text-xs text-right text-amber-700">
                            {formatPrice(day.cost)}
                          </TableCell>
                          <TableCell
                            className={`text-xs text-right font-bold ${
                              day.profit >= 0 ? "text-blue-700" : "text-red-600"
                            }`}
                          >
                            {formatPrice(day.profit)}
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
    </div>
  );
}
