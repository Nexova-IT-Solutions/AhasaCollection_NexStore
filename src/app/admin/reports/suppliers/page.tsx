"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import {
  Truck,
  Search,
  Package,
  Layers,
  DollarSign,
  Loader2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { ExcelExportUtility } from "@/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SupplierReportItem {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phoneNumber: string;
  address: string;
  totalUniqueProducts: number;
  totalItemsInStock: number;
  totalStockValue: number;
}


export default function SupplierProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { formatPrice } = useCurrency();

  const [suppliers, setSuppliers] = useState<SupplierReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleExportExcel = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Supplier-wise Stock & Inventory Valuation Report",
        filename: "Supplier_Stock_Valuation_Report",
        columns: [
          { header: "Supplier Name", key: "name", type: "string" },
          { header: "Contact Person", key: "contactName", type: "string" },
          { header: "Email Address", key: "email", type: "string" },
          { header: "Phone Number", key: "phoneNumber", type: "string" },
          { header: "Unique Products", key: "totalUniqueProducts", type: "number", alignment: "center" },
          { header: "Total Stock Qty", key: "totalItemsInStock", type: "number", alignment: "center" },
          { header: "Stock Valuation (LKR)", key: "totalStockValue", type: "currency", alignment: "right" },
        ],
        data: filteredSuppliers || [],
        includeSummaryRow: true,
      });
    } catch (err) {
      console.error("[SupplierProductsReport] Export failed:", err);
    }
  };

  // Client-side authentication and granular permission guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !hasPermission(session, "reports.supplier_products")) {
      router.push("/admin");
    }
  }, [session, status, router]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/suppliers");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load supplier reports.");
        return;
      }

      setSuppliers(json.suppliers || []);
    } catch (err) {
      console.error("[SupplierProductsReport] Fetch error:", err);
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && hasPermission(session, "reports.supplier_products")) {
      void fetchSuppliers();
    }
  }, [session]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const term = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.contactName.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  // Aggregate values
  const aggregates = useMemo(() => {
    return filteredSuppliers.reduce(
      (acc, s) => {
        acc.totalSuppliers += 1;
        acc.totalProducts += s.totalUniqueProducts;
        acc.totalStock += s.totalItemsInStock;
        acc.totalValuation += s.totalStockValue;
        return acc;
      },
      { totalSuppliers: 0, totalProducts: 0, totalStock: 0, totalValuation: 0 }
    );
  }, [filteredSuppliers]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  if (!session || !hasPermission(session, "reports.supplier_products")) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-[#A7066A]" />
            Supplier-wise Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze product counts, stock volumes, and total inventory valuation grouped by supplier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => void fetchSuppliers()}
            disabled={isLoading}
            size="sm"
            className="h-9 bg-[#A7066A] hover:bg-[#8A0558] text-white shrink-0 shadow-sm"
          >
            Refresh Report
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={filteredSuppliers.length === 0 || isLoading}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Suppliers
            </CardTitle>
            <Truck className="h-4 w-4 text-[#A7066A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {aggregates.totalSuppliers}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Active registered suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Unique Products
            </CardTitle>
            <Layers className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {aggregates.totalProducts}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Unique items managed</p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Volume
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {aggregates.totalStock}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Total units currently in stock</p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-gradient-to-br from-white to-pink-50/10 shadow-sm border-l-4 border-l-[#A7066A]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Valuation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">
              {formatPrice(aggregates.totalValuation)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Based on supplier cost price</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid View */}
      <Card className="border-brand-border shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-brand-border px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Supplier Metrics Table
            </CardTitle>
            {/* Search Input */}
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by supplier name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#A7066A]" />
              <p className="text-xs text-slate-400">Loading supplier data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button onClick={() => void fetchSuppliers()} variant="outline" size="sm" className="mt-2 text-xs">
                Retry Query
              </Button>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
              <Package className="h-9 w-9 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No suppliers found</p>
              <p className="text-xs text-slate-400">Try matching names or tags again</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-slate-600">Supplier Name</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Contact Person</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Contact details</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-center">Unique Products</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-center">Items in Stock</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-right">Stock Valuation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900 text-sm py-3.5">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {s.contactName}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5 text-slate-500">
                          <span className="font-medium text-slate-700">{s.email}</span>
                          <span>{s.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-700 text-sm">
                        {s.totalUniqueProducts}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-800 text-sm">
                        {s.totalItemsInStock}
                      </TableCell>
                      <TableCell className="text-right font-black text-[#A7066A] text-sm">
                        {formatPrice(s.totalStockValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
