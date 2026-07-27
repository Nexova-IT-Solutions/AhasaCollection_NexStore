"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Loader2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Mail,
  Phone,
  FileSpreadsheet,
} from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
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

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  orderCount: number;
  totalPurchaseValue: number;
  lastPurchaseDate: string | null;
}


const formatDate = (iso: string | null) => {
  if (!iso) return "No purchases";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function CustomerInsightsPage() {
  const { formatPrice } = useCurrency();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleExportExcel = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Customer Lifetime Value (LTV) & Insights Report",
        filename: "Customer_Insights_Report",
        columns: [
          { header: "Customer Name", key: "name", type: "string" },
          { header: "Email Address", key: "email", type: "string" },
          { header: "Phone Number", key: "phone", type: "string" },
          { header: "Registration Date", key: "joinedDate", type: "date" },
          { header: "Lifetime Order Count", key: "orderCount", type: "number", alignment: "center" },
          { header: "Lifetime Spend (LKR)", key: "totalPurchaseValue", type: "currency", alignment: "right" },
          { header: "Last Purchase Date", key: "lastPurchaseDate", type: "date" },
        ],
        data: filteredCustomers || [],
        includeSummaryRow: true,
      });
    } catch (err) {
      console.error("[CustomerInsights] Export failed:", err);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/customers");
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load customer insights");
        return;
      }

      setCustomers(json.customers);
      setFilteredCustomers(json.customers);
    } catch (err) {
      console.error("[CustomerInsights] Fetch error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search filter
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  // KPI aggregates
  const totalLTV = customers.reduce((sum, c) => sum + c.totalPurchaseValue, 0);
  const averageLTV = customers.length > 0 ? totalLTV / customers.length : 0;
  const customersWithOrders = customers.filter((c) => c.orderCount > 0).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-[#A7066A]" />
            Customer Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze customer segments and lifetime order values
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
            disabled={filteredCustomers.length === 0 || isLoading}
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
      {isLoading && customers.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
        </div>
      )}

      {(!isLoading || customers.length > 0) && (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Registered Customers */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Registered Customers
                  </p>
                  <p className="text-3xl font-black text-purple-700 mt-1">
                    {customers.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {customersWithOrders} placed at least 1 order
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-2xl text-purple-700">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Total Lifetime Value */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Customer LTV
                  </p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {formatPrice(totalLTV)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cumulative sales from registered users
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Avg Customer Value */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Average Order Value (LTV)
                  </p>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    {formatPrice(averageLTV)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mean lifetime spend per customer
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table & Filtering */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Customer Leaderboard
              </CardTitle>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Users className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
                  <p className="text-sm font-medium">No customers matched</p>
                  <p className="text-xs mt-1">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Customer
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Contact Details
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                          Total Orders
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                          Lifetime Spend (LTV)
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                          Last Purchase
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((c, idx) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-400 min-w-[20px]">
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-slate-900 text-xs">{c.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  Joined {new Date(c.joinedDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5 text-slate-600">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {c.email}
                              </span>
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {c.phone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] min-w-[40px] justify-center bg-slate-50 font-bold">
                              {c.orderCount} orders
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-black text-slate-900">
                            {formatPrice(c.totalPurchaseValue)}
                          </TableCell>
                          <TableCell className="text-xs text-center text-slate-500">
                            {formatDate(c.lastPurchaseDate)}
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
