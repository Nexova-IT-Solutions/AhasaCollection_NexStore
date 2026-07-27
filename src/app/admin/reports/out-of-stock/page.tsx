"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PackageX,
  Search,
  Loader2,
  AlertOctagon,
  ArrowUpRight,
  RefreshCw,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { ExcelExportUtility } from "@/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";

interface OutOfStockProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  categoryName: string;
  supplierName: string;
  supplierContact: string | null;
  supplierPhone: string | null;
}


export default function OutOfStockReportPage() {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<OutOfStockProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<OutOfStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleExportExcel = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Out of Stock Items Report",
        filename: "Out_Of_Stock_Report",
        columns: [
          { header: "Product Name", key: "name", type: "string" },
          { header: "SKU", key: "sku", type: "string" },
          { header: "Category", key: "categoryName", type: "string" },
          { header: "Supplier Name", key: "supplierName", type: "string" },
          { header: "Supplier Phone", key: "supplierPhone", type: "string" },
          { header: "Base Price (LKR)", key: "price", type: "currency", alignment: "right" },
          { header: "Current Stock", key: "stock", type: "number", alignment: "center" },
        ],
        data: products || [],
        includeSummaryRow: false,
      });
    } catch (err) {
      console.error("[OutOfStock] Export failed:", err);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/inventory/out-of-stock");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load out of stock report");
        return;
      }

      setProducts(json.products);
      setFilteredProducts(json.products);
    } catch (err) {
      console.error("[OutOfStock] Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle live search
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query) ||
        p.supplierName.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageX className="h-6 w-6 text-red-600" />
            Out of Stock Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking of items requiring replenishment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchData}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={products.length === 0 || isLoading}
            variant="outline"
            size="sm"
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && products.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
        </div>
      )}

      {(!isLoading || products.length > 0) && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Items Out of Stock */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Out of Stock Items
                  </p>
                  <p className="text-3xl font-black text-red-600 mt-1">
                    {products.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Active products with zero or less stock
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-2xl text-red-700">
                  <AlertOctagon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Filtered Count */}
            {searchQuery && (
              <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Matches Found
                  </p>
                  <p className="text-3xl font-black text-slate-800 mt-1">
                    {filteredProducts.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Filtered by &ldquo;{searchQuery}&rdquo;
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table & Filtering */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Replenishment Queue
              </CardTitle>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter by SKU, name, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <PackageX className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                  <p className="text-sm font-medium">No items out of stock</p>
                  <p className="text-xs mt-1">
                    All matched inventory levels are positive!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Product Name
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          SKU
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Category
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                          Price
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Supplier
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900 text-xs">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">
                            {p.sku}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {p.categoryName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-slate-800">
                            {formatPrice(p.price)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p className="font-medium text-slate-700">{p.supplierName}</p>
                              {p.supplierPhone && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {p.supplierPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px] border-slate-300"
                              >
                                <Link href={`/admin/products/${p.id}/edit`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
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
