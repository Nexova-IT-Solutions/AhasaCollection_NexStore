"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  Info,
  DollarSign,
  TrendingDown,
  Eye,
  Loader2,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ExcelExportUtility } from "@/utils/excel-export";
import { useCurrency } from "@/components/CurrencyProvider";

interface TreeRow {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  type: "category" | "subcategory" | "product";
  hasChildren: boolean;
  depth: number;
  costPrice?: number | null;
  basePrice?: number;
  salePrice?: number;
  isDiscountActive?: boolean;
  discountValue?: number;
  discountType?: "PERCENTAGE" | "FIXED" | null;
  stock?: number;
  totalStock?: number;
  totalCost?: number;
  avgPrice?: number;
}

export default function StockDrilldownPage() {
  const { formatPrice } = useCurrency();
  const [rootCategories, setRootCategories] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [childDataCache, setChildDataCache] = useState<Record<string, any[]>>({});
  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRootCategories = useCallback(async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/stock-drilldown?level=categories");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load root categories");
        return;
      }

      setRootCategories(json.data);
    } catch (err) {
      console.error("[StockDrilldown] Fetch error:", err);
      setError("Failed to communicate with database server. Please try again.");
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRootCategories();
  }, [fetchRootCategories]);

  const handleExportExcel = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Stock Drilldown Hierarchical Registry",
        filename: "Stock_Drilldown_Report",
        columns: [
          { header: "Type", key: "typeLabel", type: "string" },
          { header: "Department / Product Name", key: "depthName", type: "string" },
          { header: "SKU", key: "sku", type: "string" },
          { header: "Cost Price (LKR)", key: "costPrice", type: "currency", alignment: "right" },
          { header: "Base Retail Price (LKR)", key: "basePrice", type: "currency", alignment: "right" },
          { header: "Active Promo Price (LKR)", key: "salePrice", type: "currency", alignment: "right" },
          { header: "Current Stock", key: "stock", type: "number", alignment: "center" },
        ],
        data: allVisibleRows.map(row => ({
          ...row,
          typeLabel: row.type === "category" ? "Department" : row.type === "subcategory" ? "Sub-category" : "Product",
          depthName: `${"  ".repeat(row.depth)}${row.name}`,
          costPrice: row.type === "product" ? (row.costPrice ?? 0) : (row.totalCost ?? 0),
          basePrice: row.type === "product" ? (row.basePrice ?? 0) : (row.avgPrice ?? 0),
          salePrice: row.type === "product" ? (row.isDiscountActive ? (row.salePrice ?? 0) : (row.basePrice ?? 0)) : 0,
          stock: row.type === "product" ? (row.stock ?? 0) : (row.totalStock ?? 0)
        })),
        includeSummaryRow: false,
      });
    } catch (err) {
      console.error("[StockDrilldown] Export failed:", err);
    }
  };

  const toggleRow = async (rowId: string, type: "category" | "subcategory") => {
    const isCurrentlyExpanded = !!expandedRows[rowId];

    if (isCurrentlyExpanded) {
      setExpandedRows((prev) => ({ ...prev, [rowId]: false }));
      return;
    }

    // Check if we already have child data cached
    if (childDataCache[rowId]) {
      setExpandedRows((prev) => ({ ...prev, [rowId]: true }));
      return;
    }

    // If not cached, load on-demand
    setLoadingRows((prev) => ({ ...prev, [rowId]: true }));
    try {
      const nextLevel = type === "category" ? "subs" : "products";
      const res = await fetch(`/api/admin/reports/stock-drilldown?level=${nextLevel}&parentId=${rowId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setChildDataCache((prev) => ({ ...prev, [rowId]: json.data }));
        setExpandedRows((prev) => ({ ...prev, [rowId]: true }));
      } else {
        console.error("Failed to load children nodes:", json.message);
      }
    } catch (err) {
      console.error("Error loading node children:", err);
    } finally {
      setLoadingRows((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  // Traverse the dynamic category tree and build a flat rendering array
  const buildVisibleRows = useCallback(() => {
    const list: TreeRow[] = [];

    const traverse = (items: any[], currentDepth: number) => {
      for (const item of items) {
        const row: TreeRow = {
          id: item.id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          type: item.type,
          hasChildren: item.hasChildren,
          depth: currentDepth,
          costPrice: item.costPrice,
          basePrice: item.basePrice,
          salePrice: item.salePrice,
          isDiscountActive: item.isDiscountActive,
          discountValue: item.discountValue,
          discountType: item.discountType,
          stock: item.stock,
          totalStock: item.totalStock,
          totalCost: item.totalCost,
          avgPrice: item.avgPrice,
        };
        list.push(row);

        if (expandedRows[item.id] && childDataCache[item.id]) {
          traverse(childDataCache[item.id], currentDepth + 1);
        }
      }
    };

    traverse(rootCategories, 0);
    return list;
  }, [rootCategories, expandedRows, childDataCache]);

  const allVisibleRows = buildVisibleRows();

  // Handle local searching/filtering across currently loaded rows
  const filteredRows = allVisibleRows.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.name.toLowerCase().includes(query) ||
      (row.sku && row.sku.toLowerCase().includes(query)) ||
      row.type.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return formatPrice(amount);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1720] tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-[#A7066A]" />
            Stock Drill-down Report
          </h1>
          <p className="text-sm text-[#6B5A64] mt-1">
            Dynamic on-demand tracking of catalog categories, sub-categories, and terminal products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setExpandedRows({});
              setChildDataCache({});
              fetchRootCategories();
            }}
            disabled={globalLoading}
            variant="outline"
            size="sm"
            className="h-9 border-[#brand-border] hover:bg-[#FCEAF4] hover:text-[#A7066A] transition-colors duration-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${globalLoading ? "animate-spin" : ""}`} />
            Refresh Report
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={allVisibleRows.length === 0 || globalLoading}
            variant="outline"
            size="sm"
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2 shadow-sm animate-shake">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}



      {/* Main Table Card */}
      <Card className="border-0 shadow-md overflow-hidden bg-white/80 backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">Inventory Status Tree</CardTitle>
            <CardDescription className="text-xs text-[#6B5A64]">
              Click categories to reveal sub-sections. Product pricing includes discounts.
            </CardDescription>
          </div>

          {/* Local Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search active rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors duration-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {globalLoading && rootCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
              <p className="text-xs text-[#6B5A64] font-medium">Querying initial stock distribution...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Search className="h-10 w-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-sm font-medium">No inventory elements match your query</p>
              <p className="text-xs mt-1">Try expanding categories first to query deeper items</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider pl-6">
                      Element / Product Name
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider">
                      SKU
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider text-right">
                      Cost Price
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider text-right">
                      Base Price
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider">
                      Discount Status
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider text-right">
                      Available Stock
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-[#6B5A64] uppercase tracking-wider text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {filteredRows.map((row) => {
                      const isExpanded = !!expandedRows[row.id];
                      const isLoading = !!loadingRows[row.id];
                      const isLowStock = row.type === "product" && typeof row.stock === "number" && row.stock < 5;

                      return (
                        <motion.tr
                          key={`${row.id}-${row.depth}`}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className={`border-b border-slate-100 transition-colors duration-150 ${
                            row.type === "category"
                              ? "bg-slate-50/30 hover:bg-slate-50/70"
                              : row.type === "subcategory"
                              ? "bg-slate-50/10 hover:bg-slate-50/40"
                              : isLowStock
                              ? "bg-rose-50/30 hover:bg-rose-50/50"
                              : "hover:bg-slate-50/30"
                          }`}
                        >
                          {/* Name & Tree Indicator */}
                          <TableCell className="py-2.5 font-medium pl-6 text-xs text-slate-800">
                            <div
                              style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                              className="flex items-center gap-2"
                            >
                              {row.type !== "product" ? (
                                <button
                                  onClick={() => toggleRow(row.id, row.type as any)}
                                  className="p-1 rounded hover:bg-slate-200/50 text-[#6B5A64] transition-colors focus:outline-none shrink-0"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A7066A]" />
                                  ) : isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-5.5 flex justify-center shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#A7066A]/40" />
                                </div>
                              )}

                              <span
                                className={`${
                                  row.type === "category"
                                    ? "font-bold text-[#A7066A] text-[13px]"
                                    : row.type === "subcategory"
                                    ? "font-semibold text-slate-700"
                                    : "text-slate-900"
                                }`}
                              >
                                {row.name}
                              </span>

                              {row.type === "category" && (
                                <Badge className="bg-[#FCEAF4] text-[#A7066A] border-0 hover:bg-[#FCEAF4] text-[9px] py-0 px-1.5 rounded-full scale-90">
                                  Category
                                </Badge>
                              )}
                              {row.type === "subcategory" && (
                                <Badge variant="outline" className="text-slate-500 text-[9px] py-0 px-1.5 rounded-full scale-90">
                                  Sub-cat
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* SKU */}
                          <TableCell className="py-2.5 text-xs font-mono text-slate-600">
                            {row.type === "product" ? row.sku : "—"}
                          </TableCell>

                          {/* Cost Price */}
                          <TableCell className="py-2.5 text-xs text-right text-slate-500 font-mono">
                            {row.type === "product" ? (
                              row.costPrice !== null && row.costPrice !== undefined ? formatCurrency(row.costPrice) : "—"
                            ) : row.totalCost !== undefined ? (
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-slate-700">{formatCurrency(row.totalCost)}</span>
                                <span className="text-[9px] text-[#A7066A] font-sans font-medium">(Total Cost)</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Base Price */}
                          <TableCell className="py-2.5 text-xs text-right font-medium text-slate-700 font-mono">
                            {row.type === "product" ? (
                              row.basePrice !== undefined ? formatCurrency(row.basePrice) : "—"
                            ) : row.avgPrice !== undefined ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-800">{formatCurrency(row.avgPrice)}</span>
                                <span className="text-[9px] text-emerald-600 font-sans font-semibold">(Total Retail Value)</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Discount Status */}
                          <TableCell className="py-2.5 text-xs">
                            {row.type === "product" ? (
                              row.isDiscountActive && row.salePrice !== undefined ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-0 text-[10px] font-semibold py-0.5 px-1.5">
                                    <Percent className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                    Active
                                  </Badge>
                                  <span className="font-bold text-emerald-700 font-mono">
                                    {formatCurrency(row.salePrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No active discount</span>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Available Stock */}
                          <TableCell className="py-2.5 text-xs text-right font-mono">
                            {row.type === "product" && row.stock !== undefined ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`font-bold ${isLowStock ? "text-rose-600" : "text-slate-900"}`}>
                                  {row.stock}
                                </span>
                                {isLowStock && (
                                  <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 text-[9px] font-bold py-0.5 px-1 rounded-full animate-pulse">
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                            ) : row.totalStock !== undefined ? (
                              <span className="font-bold text-slate-800">
                                {row.totalStock}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Action */}
                          <TableCell className="py-2.5 text-center">
                            {row.type === "product" ? (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-[#FCEAF4] hover:text-[#A7066A] rounded-full"
                              >
                                <Link href={`/admin/products/${row.id}/edit`}>
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="sr-only">Edit Product</span>
                                </Link>
                              </Button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
