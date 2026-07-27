"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import {
  PieChart,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { ExcelExportUtility } from "@/utils/excel-export";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/components/CurrencyProvider";
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

interface ProductSales {
  id: string;
  name: string;
  totalQtySold: number;
  totalRevenue: number;
}

interface CategorySalesItem {
  id: string;
  name: string;
  totalQtySold: number;
  totalRevenue: number;
  products: ProductSales[];
}


export default function CategorySalesPage() {
  const { formatPrice } = useCurrency();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<CategorySalesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded category IDs for drill-down
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Default to past 30 days
  const now = new Date();
  const past30Days = new Date();
  past30Days.setDate(now.getDate() - 30);

  const [startDate, setStartDate] = useState(past30Days.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);

  const handleExportExcel = async () => {
    try {
      const exportData: any[] = [];
      categories.forEach(cat => {
        exportData.push({
          type: "Category Total",
          name: cat.name,
          qtySold: cat.totalQtySold,
          revenue: cat.totalRevenue
        });
        cat.products.forEach(p => {
          exportData.push({
            type: "Product Sale",
            name: `  - ${p.name}`,
            qtySold: p.totalQtySold,
            revenue: p.totalRevenue
          });
        });
      });

      await ExcelExportUtility.exportToExcel({
        title: `Category and Product Sales Report (${startDate} to ${endDate})`,
        filename: `Category_Sales_Report_${startDate}_to_${endDate}`,
        columns: [
          { header: "Type", key: "type", type: "string" },
          { header: "Category / Product Name", key: "name", type: "string" },
          { header: "Quantity Sold", key: "qtySold", type: "number", alignment: "center" },
          { header: "Revenue Contribution (LKR)", key: "revenue", type: "currency", alignment: "right" },
        ],
        data: exportData,
        includeSummaryRow: false,
      });
    } catch (err) {
      console.error("[CategorySalesReport] Export failed:", err);
    }
  };

  // Client-side authentication and granular permission guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !hasPermission(session, "reports.category_sales")) {
      router.push("/admin");
    }
  }, [session, status, router]);

  const fetchCategorySales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/admin/reports/category-sales?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load category sales data.");
        return;
      }

      setCategories(json.categories || []);
    } catch (err) {
      console.error("[CategorySalesReport] Fetch error:", err);
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (session && hasPermission(session, "reports.category_sales")) {
      void fetchCategorySales();
    }
  }, [session, fetchCategorySales]);

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Aggregated summary metrics
  const summary = useMemo(() => {
    return categories.reduce(
      (acc, cat) => {
        acc.totalQty += cat.totalQtySold;
        acc.totalRevenue += cat.totalRevenue;
        acc.totalCategories += 1;
        return acc;
      },
      { totalQty: 0, totalRevenue: 0, totalCategories: 0 }
    );
  }, [categories]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  if (!session || !hasPermission(session, "reports.category_sales")) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header & Date Pickers */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PieChart className="h-6 w-6 text-[#A7066A]" />
            Category & Sub-category Sales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Drill-down into product sales volumes and total revenue metrics within a date range.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs w-[140px] focus-visible:ring-[#A7066A]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs w-[140px] focus-visible:ring-[#A7066A]"
            />
          </div>
          <Button
            onClick={() => void fetchCategorySales()}
            disabled={isLoading}
            size="sm"
            className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white shrink-0 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 font-medium">Apply Filters</span>
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={categories.length === 0 || isLoading}
            variant="outline"
            size="sm"
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Categories Sold
            </CardTitle>
            <Layers className="h-4 w-4 text-[#A7066A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {summary.totalCategories}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Unique category lines</p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Items Sold
            </CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {summary.totalQty}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Total items sold in range</p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm border-l-4 border-l-[#A7066A]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">
              {formatPrice(summary.totalRevenue)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Sum of all paid order lines</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid View with Drilldown Table */}
      <Card className="border-brand-border shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-brand-border px-5 py-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Category Sales Drilldown (Click rows to expand)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#A7066A]" />
              <p className="text-xs text-slate-400">Loading sales data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button onClick={() => void fetchCategorySales()} variant="outline" size="sm" className="mt-2 text-xs">
                Retry Query
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
              <Package className="h-9 w-9 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No sales transactions</p>
              <p className="text-xs text-slate-400">Try broadening your date filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Category Name</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-center">Qty Sold</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-center">Products Count</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => {
                    const isExpanded = !!expandedCategories[cat.id];
                    return (
                      <React.Fragment key={cat.id}>
                        {/* Main Category Row */}
                        <TableRow
                          onClick={() => toggleExpand(cat.id)}
                          className="hover:bg-slate-50/70 cursor-pointer select-none transition-colors"
                        >
                          <TableCell className="text-center py-3.5">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-sm">
                            {cat.name}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 text-sm">
                            {cat.totalQtySold}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge variant="secondary" className="px-2 py-0.5 font-medium rounded-full bg-slate-100 text-slate-600 border-none">
                              {cat.products.length} products
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 text-sm">
                            {formatPrice(cat.totalRevenue)}
                          </TableCell>
                        </TableRow>

                        {/* Nested Sub-table Drill-down */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/40">
                            <TableCell colSpan={5} className="p-0 border-t border-b border-brand-border">
                              <div className="px-10 py-4 overflow-x-auto">
                                <Table className="border border-brand-border rounded-xl overflow-hidden bg-white shadow-sm">
                                  <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="font-medium text-[11px] text-slate-500 h-8">Product Name</TableHead>
                                      <TableHead className="font-medium text-[11px] text-slate-500 text-center h-8">Qty Sold</TableHead>
                                      <TableHead className="font-medium text-[11px] text-slate-500 text-right h-8">Revenue Contribution</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cat.products.map((p) => (
                                      <TableRow key={p.id} className="hover:bg-slate-50/30 transition-colors h-9">
                                        <TableCell className="text-xs font-semibold text-slate-800 py-2">
                                          {p.name}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-medium text-slate-600">
                                          {p.totalQtySold}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-bold text-[#A7066A]">
                                          {formatPrice(p.totalRevenue)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
