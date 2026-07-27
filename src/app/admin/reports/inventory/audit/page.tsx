"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Search,
  Loader2,
  Printer,
  RefreshCw,
  Filter,
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

interface AuditRecord {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  costPrice: number;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
}

export default function StockAuditReportPage() {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<AuditRecord[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleExportExcel = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Physical Inventory Audit Sheet",
        filename: "Inventory_Audit_Report",
        columns: [
          { header: "SKU", key: "sku", type: "string" },
          { header: "Product Name", key: "name", type: "string" },
          { header: "Category", key: "categoryName", type: "string" },
          { header: "Supplier", key: "supplierName", type: "string" },
          { header: "Stock Count", key: "stock", type: "number", alignment: "center" },
          { header: "Cost Price (LKR)", key: "costPrice", type: "currency", alignment: "right" },
          { header: "Base Retail Price (LKR)", key: "price", type: "currency", alignment: "right" },
        ],
        data: filteredProducts || [],
        includeSummaryRow: false,
      });
    } catch (err) {
      console.error("[StockAudit] Export failed:", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  // Selected filters
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/inventory/audit");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load audit report");
        return;
      }

      setProducts(json.products);
      setFilteredProducts(json.products);

      // Extract unique categories and suppliers
      const uniqueCats = Array.from(
        new Set(json.products.map((p: AuditRecord) => p.categoryName))
      ) as string[];
      const uniqueSups = Array.from(
        new Set(json.products.map((p: AuditRecord) => p.supplierName))
      ) as string[];

      setCategories(uniqueCats.sort());
      setSuppliers(uniqueSups.sort());
    } catch (err) {
      console.error("[StockAudit] Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    let result = products;

    // Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "ALL") {
      result = result.filter((p) => p.categoryName === selectedCategory);
    }

    // Supplier filter
    if (selectedSupplier !== "ALL") {
      result = result.filter((p) => p.supplierName === selectedSupplier);
    }

    setFilteredProducts(result);
  }, [searchQuery, selectedCategory, selectedSupplier, products]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Dynamic print-specific styles to hide sidebar and header navigation on paper print */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, 
          header, 
          button, 
          .no-print, 
          .sidebar-provider,
          [role="banner"] {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-header {
            display: block !important;
          }
          .print-border {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[#A7066A]" />
            Stock Audit Sheet
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconciliation utility. Print and perform physical stock checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handlePrint}
            disabled={isLoading || products.length === 0}
            size="sm"
            className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white flex items-center gap-1.5 font-semibold"
          >
            <Printer className="h-4 w-4" />
            Print Audit Sheet
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={isLoading || filteredProducts.length === 0}
            variant="outline"
            size="sm"
            className="h-9 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Print-Only Sheet Header */}
      <div className="hidden print-header mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          SPC — Physical Inventory Audit
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Generated on: {new Date().toLocaleString()} | Filter: Category ({selectedCategory}), Supplier ({selectedSupplier})
        </p>
        <hr className="my-4 border-slate-300" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 no-print">
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
          {/* Filtering Controls */}
          <Card className="border-0 shadow-md no-print">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
              {/* Live search */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter by SKU or product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full sm:w-48 space-y-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-2.5 py-1.5 focus:border-[#A7066A] focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div className="w-full sm:w-48 space-y-1">
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-2.5 py-1.5 focus:border-[#A7066A] focus:outline-none"
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliers.map((sup) => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Audit Sheet Table */}
          <Card className="border-0 shadow-md print:shadow-none print:border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between no-print">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Active Items count ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="print:p-0">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ClipboardCheck className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                  <p className="text-sm font-medium">No items match current filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="print-border">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-black">
                          SKU
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-black">
                          Product Name
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-black">
                          Category
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-black">
                          Supplier
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right print:text-black">
                          Cost Price
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right print:text-black">
                          Base Retail Price
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right print:text-black">
                          Stock Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                          <TableCell className="text-xs font-mono font-bold text-slate-700 print:text-black">
                            {p.sku}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 text-xs print:text-black">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 print:text-black">
                            {p.categoryName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 print:text-black">
                            {p.supplierName}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium text-slate-700 font-mono print:text-black">
                            {p.costPrice !== undefined && p.costPrice !== null ? formatPrice(p.costPrice) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium text-slate-700 font-mono print:text-black">
                            {p.price !== undefined && p.price !== null ? formatPrice(p.price) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-black text-slate-800 print:text-black">
                            {p.stock}
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
