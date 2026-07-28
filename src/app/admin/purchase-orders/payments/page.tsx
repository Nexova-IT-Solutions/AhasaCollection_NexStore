"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Building2,
  CreditCard,
  Search,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { useCurrency } from "@/components/CurrencyProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SupplierPaymentsPage() {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");

  // Payment modal
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRefNo, setPayRefNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/admin/purchase-orders/payments", fetcher);
  const suppliers = data?.suppliers || [];

  const filteredSuppliers = suppliers.filter((sup: any) =>
    sup.name.toLowerCase().includes(search.toLowerCase()) ||
    (sup.contactName && sup.contactName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOutstanding = suppliers.reduce((sum: number, s: any) => sum + (s.outstandingBalance || 0), 0);
  const totalPurchasesAll = suppliers.reduce((sum: number, s: any) => sum + (s.totalPurchases || 0), 0);

  const openPaymentModal = (sup: any) => {
    setSelectedSupplier(sup);
    setPayAmount(sup.outstandingBalance);
    setPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/purchase-orders">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1F1720] flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#A7066A]" />
              Supplier Balances & Payments
            </h1>
            <p className="text-[#6B5A64] mt-1 text-sm">
              Manage outstanding supplier balances, credit purchases, and payment settlements.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-brand-border shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                Total Outstanding Balance
              </p>
              <p className="text-2xl font-black text-[#A7066A] mt-1">
                {formatPrice(totalOutstanding)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-[#A7066A]">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-brand-border shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                Total Cumulative Purchases
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatPrice(totalPurchasesAll)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-brand-border shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                Registered Suppliers
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {suppliers.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search supplier by name or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {/* Supplier Balances Table */}
      <Card className="border-brand-border shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading supplier balances…
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">No suppliers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Supplier Name
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Total Purchases
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Total Paid
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Outstanding Balance
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Pending POs
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50 bg-white">
                  {filteredSuppliers.map((sup: any) => (
                    <tr key={sup.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-4 font-bold text-[#1F1720]">
                        {sup.name}
                        <span className="block text-[11px] text-slate-400 font-normal font-mono">
                          {sup.phoneNumber || sup.email || "No contact info"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium">{sup.contactName || "—"}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {formatPrice(sup.totalPurchases)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600">
                        {formatPrice(sup.totalPaid)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-[#A7066A] text-base">
                        {formatPrice(sup.outstandingBalance)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant="outline"
                          className={`font-bold ${
                            sup.activeOrdersCount > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {sup.activeOrdersCount} POs
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          disabled={sup.outstandingBalance <= 0}
                          onClick={() => openPaymentModal(sup)}
                          size="sm"
                          className="bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold h-8 text-xs gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Settle Balance
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
