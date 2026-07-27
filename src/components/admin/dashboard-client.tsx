"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useCurrency } from "@/components/CurrencyProvider";
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  BarChart3, 
  StarOff, 
  PackageX, 
  PackageOpen, 
  Calendar,
  Percent,
  TrendingDown,
  User as UserIcon,
  RefreshCw,
  Plus,
  Settings,
  Shield,
  Activity
} from "lucide-react";
import { startOfMonth, subDays } from "date-fns";
import { formatAppDateSync as format } from "@/lib/date-utils";
import { useTimezone } from "@/components/TimezoneProvider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface DashboardClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
  initialData: {
    kpis: {
      todaySales: number;
      todayProfit: number;
      dailyOrderCount: number;
      monthlyRevenue: number;
    };
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
    }>;
    unratedProducts: any[];
    outOfStockProducts: any[];
    weeklyOrderVolume?: number[];
  };
  hasSalesSummaryPermission?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboardClient({ user, initialData, hasSalesSummaryPermission = true }: DashboardClientProps) {
  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const showActiveBoxes = toggles?.giftboxes_available !== false;
  const showShipping = toggles?.operations_section !== false && toggles?.operations_shipping !== false;
  const showReviews = toggles?.operations_section !== false && toggles?.operations_reviews !== false;
  // 1. Date Range States
  const tz = useTimezone();
  const now = new Date();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(now), "yyyy-MM-dd", tz));
  const [endDate, setEndDate] = useState<string>(format(now, "yyyy-MM-dd", tz));
  const [mounted, setMounted] = useState(false);
  
  // 2. Sales Summary State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [salesSummary, setSalesSummary] = useState<{
    numberOfSales: number;
    costOfSales: number;
    discountedAmount: number;
    profit: number;
    totalRevenue: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (hasSalesSummaryPermission) {
      fetchSalesSummary();
    }
  }, [hasSalesSummaryPermission]);

  // 3. Fetch Sales Summary Data
  const fetchSalesSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`
      );
      const resData = await response.json();
      if (resData.success && resData.summary) {
        setSalesSummary({
          numberOfSales: resData.summary.orderCount,
          costOfSales: resData.summary.totalCostOfSales,
          discountedAmount: resData.summary.totalDiscounts,
          profit: resData.summary.netProfit,
          totalRevenue: resData.summary.totalSales,
        });
      } else {
        setError(resData.message || "Failed to load sales summary.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const { formatPrice, symbol } = useCurrency();
  const formatCurrency = (val: number) => formatPrice(val);

  // Generate chart data based on dynamic daily order counts
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(now, 6 - i);
    const dayName = format(d, "EEE");
    return {
      name: dayName,
      orders: initialData.weeklyOrderVolume?.[i] ?? 0
    };
  });

  return (
    <div className="w-full bg-[#FAFAFB] min-h-screen py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Dynamic User Profile & Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-xl shadow-xs border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center font-bold text-2xl border border-pink-100 shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1F1720] tracking-tight">
                  Welcome back, {user.name || "Store Manager"}!
                </h1>
                <Badge className="bg-[#FCEAF4] text-[#A7066A] border-none text-xs font-semibold py-0.5 px-2">
                  {user.role}
                </Badge>
              </div>
              <p className="text-[#6B5A64] text-xs font-medium mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="text-left xl:text-right">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Status</p>
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live & Secure
            </p>
          </div>
        </div>

        {/* --- DYNAMIC SNAPSHOT GRID (3 COLUMNS) --- */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#1F1720]">Today's Snapshot</h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${showActiveBoxes ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-6`}>
            
            {/* Total Revenue Card */}
            <Card className="rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50/40 to-white shadow-xs p-6 relative overflow-hidden group hover:shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-[#1F1720] mt-1 tracking-tight">
                    {formatCurrency(initialData.kpis.todaySales)}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-100/60 rounded-xl text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Today's Sales</span>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-semibold text-[10px] px-2 py-0.5">
                  Monthly: {formatCurrency(initialData.kpis.monthlyRevenue)}
                </Badge>
              </div>
            </Card>

            {/* Active Boxes / Today's Profit Card */}
            {showActiveBoxes && (
              <Card className="rounded-xl border border-gray-100 bg-gradient-to-br from-indigo-50/40 to-white shadow-xs p-6 relative overflow-hidden group hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Boxes</p>
                    <h3 className="text-2xl font-bold text-[#1F1720] mt-1 tracking-tight">
                      {formatCurrency(initialData.kpis.todayProfit)}
                    </h3>
                  </div>
                  <div className="p-3 bg-indigo-100/60 rounded-xl text-indigo-700">
                    <PackageOpen className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">Today's Profit</span>
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-semibold text-[10px] px-2 py-0.5">
                    Net Margins
                  </Badge>
                </div>
              </Card>
            )}

            {/* Orders Card */}
            <Card className="rounded-xl border border-gray-100 bg-gradient-to-br from-amber-50/40 to-white shadow-xs p-6 relative overflow-hidden group hover:shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders</p>
                  <h3 className="text-2xl font-bold text-[#1F1720] mt-1 tracking-tight">
                    {initialData.kpis.dailyOrderCount.toLocaleString()}
                  </h3>
                </div>
                <div className="p-3 bg-amber-100/60 rounded-xl text-amber-700">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Today's Orders</span>
                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none font-semibold text-[10px] px-2 py-0.5">
                  Fulfillments
                </Badge>
              </div>
            </Card>

          </div>
        </div>

        {/* --- SALES SUMMARY SECTION --- */}
        {hasSalesSummaryPermission && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-[#1F1720] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#A7066A]" />
                Sales Summary & Asset Valuation
              </h2>
              <p className="text-muted-foreground text-xs font-semibold mt-1">
                Select a date range to calculate true warehouse cost, discounts, and net profits.
              </p>
            </div>

            {/* Date Picker Form */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#A7066A] font-medium text-slate-700"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#A7066A] font-medium text-slate-700"
                />
              </div>
              <div className="flex flex-col justify-end pt-5">
                <button
                  onClick={fetchSalesSummary}
                  disabled={loading}
                  className="h-8.5 px-4 bg-[#A7066A] hover:bg-[#8E0459] text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Generate Summary"
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-medium border border-rose-100">
              {error}
            </div>
          )}

          {/* Sales Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryKpiCard
              title="Number of Sales"
              value={loading ? "Calculating..." : salesSummary ? salesSummary.numberOfSales.toLocaleString() : "—"}
              description={`Total closed orders inside range`}
              icon={ShoppingCart}
              color="bg-purple-50 text-purple-600"
            />
            <SummaryKpiCard
              title="Cost of Sales (COGS)"
              value={loading ? "Calculating..." : salesSummary ? formatCurrency(salesSummary.costOfSales) : "—"}
              description={`Weighted asset procurement costs`}
              icon={TrendingDown}
              color="bg-rose-50 text-rose-600"
            />
            <SummaryKpiCard
              title="Discounted Amount"
              value={loading ? "Calculating..." : salesSummary ? formatCurrency(salesSummary.discountedAmount) : "—"}
              description={`Cumulative retail price reductions`}
              icon={Percent}
              color="bg-amber-50 text-amber-600"
            />
            <SummaryKpiCard
              title="Net Profit"
              value={loading ? "Calculating..." : salesSummary ? formatCurrency(salesSummary.profit) : "—"}
              description={`Net margins after procurement offsets`}
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600"
              highlight={true}
            />
          </div>
        </div>
        )}

        {/* --- MAIN PAGE RESPONSIVE 3-COLUMN CONTAINER --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT AREA: Charts & Product Information (Span 2) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Orders Over Time Chart */}
            <Card className="border border-gray-100 shadow-xs rounded-xl bg-white p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-[#1F1720]">Orders Over Time</CardTitle>
                <CardDescription>Daily order volume and trend metrics</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <div className="h-72 w-full">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A7066A" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#A7066A" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94A3B8" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#94A3B8" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-md border-none">
                                  <p className="font-semibold">{payload[0].payload.name}</p>
                                  <p className="text-[#FCEAF4] font-medium mt-0.5">{payload[0].value} orders</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="orders" 
                          stroke="#A7066A" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#colorOrders)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Products Table */}
            <Card className="border border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-[#1F1720]">Top Selling Products</CardTitle>
                <CardDescription>Highest volume items based on orders</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="w-[100px] pl-4">Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right pr-4">Sales Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.topProducts.length > 0 ? initialData.topProducts.map((product, index) => (
                      <TableRow key={`${product.id}-${index}`} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                        <TableCell className="pl-4 font-medium text-xs">#{index + 1}</TableCell>
                        <TableCell className="font-semibold text-xs text-[#1F1720]">{product.name}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] font-semibold">
                            {product.sales} units
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground">
                          No sales data available for top products.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Lists: Unrated & Out of stock */}
            <div className={`grid grid-cols-1 ${showReviews ? "md:grid-cols-2" : ""} gap-6`}>
              {/* Unrated Products List */}
              {showReviews && (
                <Card className="border border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white p-6">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center gap-2">
                      <StarOff className="w-4.5 h-4.5 text-amber-500" />
                      <CardTitle className="text-base font-bold text-[#1F1720]">Unrated Products</CardTitle>
                    </div>
                    <CardDescription>Items missing customer reviews</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                      {initialData.unratedProducts.length > 0 ? initialData.unratedProducts.map((product) => (
                        <div key={product.id} className="py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden relative">
                              {Array.isArray(product.productImages) && (product.productImages as any)[0]?.url ? (
                                <Image 
                                  src={(product.productImages as any)[0].url} 
                                  alt={product.name} 
                                  fill 
                                  className="object-cover"
                                />
                              ) : (
                                <PackageOpen className="w-5 h-5 m-2.5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#1F1720] line-clamp-1">{product.name}</p>
                              <p className="text-[10px] font-semibold text-[#6B5A64] mt-0.5">{formatCurrency(product.price)}</p>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-6 text-center text-xs text-muted-foreground">All products have reviews!</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Out of Stock Products List */}
              <Card className="border border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white p-6">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center gap-2">
                    <PackageX className="w-4.5 h-4.5 text-rose-500" />
                    <CardTitle className="text-base font-bold text-[#1F1720]">Out of Stock</CardTitle>
                  </div>
                  <CardDescription>Items requiring immediate restock</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full">
                    <div className="grid grid-cols-12 gap-2 pb-2 text-[11px] font-semibold text-slate-500 border-b border-gray-100 px-1">
                      <div className="col-span-6">Item Name</div>
                      <div className="col-span-3">SKU Code</div>
                      <div className="col-span-3">Supplier</div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {initialData.outOfStockProducts.length > 0 ? initialData.outOfStockProducts.map((product: any) => (
                        <div key={product.id} className="grid grid-cols-12 gap-2 py-3 px-1 items-center hover:bg-gray-50/50 transition-colors">
                          <div className="col-span-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-50/30 border border-rose-100 overflow-hidden relative shrink-0">
                              {Array.isArray(product.productImages) && (product.productImages as any)[0]?.url ? (
                                <Image 
                                  src={(product.productImages as any)[0].url} 
                                  alt={product.name} 
                                  fill 
                                  className="object-cover opacity-60"
                                />
                              ) : (
                                <PackageOpen className="w-4 h-4 m-2 text-rose-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#1F1720] truncate">{product.name}</p>
                              <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-rose-200 text-rose-600 bg-rose-50 mt-0.5">OOS</Badge>
                            </div>
                          </div>
                          <div className="col-span-3 text-xs text-slate-600 truncate">{product.sku || "-"}</div>
                          <div className="col-span-3 text-xs text-slate-600 truncate">{product.supplier?.name || "-"}</div>
                        </div>
                      )) : (
                        <div className="py-6 text-center text-xs text-muted-foreground">Everything is in stock!</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          {/* RIGHT AREA: Quick Actions & Recent Activity (Span 1) */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Quick Actions */}
            <Card className="border border-gray-100 shadow-xs rounded-xl bg-white p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-[#1F1720]">Quick Actions</CardTitle>
                <CardDescription>Common store administrator actions</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2 grid grid-cols-2 gap-3">
                <a href="/admin/products" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-[#FCEAF4]/15 hover:border-[#A7066A]/30 transition-all text-center group">
                  <Plus className="w-5 h-5 text-[#A7066A] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-700">Add Product</span>
                </a>
                {showShipping && (
                  <a href="/admin/settings/shipping" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-[#FCEAF4]/15 hover:border-[#A7066A]/30 transition-all text-center group">
                    <Settings className="w-5 h-5 text-[#A7066A] mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-700">Shipping</span>
                  </a>
                )}
                <a href="/admin/pos/shifts" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-[#FCEAF4]/15 hover:border-[#A7066A]/30 transition-all text-center group">
                  <ShoppingCart className="w-5 h-5 text-[#A7066A] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-700">POS Shifts</span>
                </a>
                <a href="/admin/discounts" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-[#FCEAF4]/15 hover:border-[#A7066A]/30 transition-all text-center group">
                  <Percent className="w-5 h-5 text-[#A7066A] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-700">Discounts</span>
                </a>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-gray-100 shadow-xs rounded-xl bg-white p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold text-[#1F1720]">Recent Activity</CardTitle>
                <CardDescription>Live updates from store operations</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start text-sm">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 mt-0.5">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Order #1042 Paid</p>
                      <p className="text-[10px] text-muted-foreground">{symbol}4,200 via DirectPay • 5m ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start text-sm">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600 mt-0.5">
                      <PackageX className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Low Stock Alert</p>
                      <p className="text-[10px] text-muted-foreground">"Red Velvet Box Wrap" is low (2 left) • 12m ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start text-sm">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Shift Register Closed</p>
                      <p className="text-[10px] text-muted-foreground">Drawer closed by operator • 1h ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start text-sm">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 mt-0.5">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">New Coupon Created</p>
                      <p className="text-[10px] text-muted-foreground">"GIFTBOX10" active (10% Off) • 3h ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}

// Summary KPI Card Component
function SummaryKpiCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  highlight = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`border border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden group hover:shadow-sm transition-all duration-200 ${highlight ? "ring-1 ring-emerald-500/20 bg-emerald-50/10" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <div className={`text-xl font-bold tracking-tight ${highlight ? "text-emerald-700" : "text-[#1F1720]"}`}>{value}</div>
          <p className="text-[10px] text-muted-foreground pt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
