"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Calendar as CalendarIcon,
  Package,
  Search,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { useCurrency } from "@/components/CurrencyProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ItemRow = {
  id: string;
  productId?: string;
  itemName: string;
  sku: string;
  requestedQty: number;
  unit: string;
  estimatedUnitCost: number;
  reason: string;
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { data: session } = useSession();

  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [requestType, setRequestType] = useState("RESTOCK");
  const [priority, setPriority] = useState("NORMAL");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Items state
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "1",
      itemName: "Harry Potter Book",
      sku: "HP001",
      requestedQty: 50,
      unit: "Books",
      estimatedUnitCost: 10,
      reason: "Stock below reorder level",
    },
    {
      id: "2",
      itemName: "Game of Thrones Book",
      sku: "GOT001",
      requestedQty: 20,
      unit: "Books",
      estimatedUnitCost: 12,
      reason: "Customer demand",
    },
  ]);

  // Product Picker state
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Fetch session & metadata options
  const { data: sessionData } = useSWR("/api/admin/me", fetcher);
  const { data: suppliersData, isLoading: suppliersLoading } = useSWR("/api/admin/suppliers", fetcher);
  const { data: repositoriesData } = useSWR("/api/admin/repositories", fetcher);
  const { data: productsData } = useSWR("/api/admin/products?pageSize=100", fetcher);

  useEffect(() => {
    const currentUserName = session?.user?.name || session?.user?.email || sessionData?.user?.name || sessionData?.user?.email;
    if (currentUserName && !requestedBy) {
      setRequestedBy(currentUserName);
    }
  }, [session, sessionData, requestedBy]);

  const suppliers = Array.isArray(suppliersData?.suppliers) ? suppliersData.suppliers : (Array.isArray(suppliersData) ? suppliersData : []);
  const repositories = Array.isArray(repositoriesData) ? repositoriesData : (Array.isArray(repositoriesData?.repositories) ? repositoriesData.repositories : []);
  const existingProducts = Array.isArray(productsData?.products) ? productsData.products : [];

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        itemName: "",
        sku: "",
        requestedQty: 1,
        unit: "Pcs",
        estimatedUnitCost: 0,
        reason: "",
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) {
      toast({
        title: "Item required",
        description: "A purchase order must have at least one item.",
        variant: "destructive",
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSelectExistingProduct = (prod: any) => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        productId: prod.id,
        itemName: prod.name,
        sku: prod.sku || "",
        requestedQty: 1,
        unit: "Pcs",
        estimatedUnitCost: prod.costPrice || prod.price || 0,
        reason: "Stock replenishment",
      },
    ]);
    setProductPickerOpen(false);
  };

  const totalEstimatedCost = items.reduce(
    (sum, item) => sum + (Number(item.requestedQty) || 0) * (Number(item.estimatedUnitCost) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast({
        title: "Supplier required",
        description: "Please select a supplier from the list.",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = items.filter((i) => !i.itemName.trim() || Number(i.requestedQty) <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Invalid Item details",
        description: "All items must have a name and a quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestDate,
          branchId: branchId || null,
          branchName: branchName || null,
          supplierId,
          requestType,
          priority,
          expectedDeliveryDate: expectedDeliveryDate || null,
          remarks: remarks || null,
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create Purchase Order");
      }

      toast({
        title: "Purchase Order Created",
        description: `Request ${data.purchaseOrder.poNumber} has been routed for Stock Admin approval.`,
      });

      router.push(`/admin/purchase-orders/${data.purchaseOrder.id}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1300px] mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/purchase-orders">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1F1720] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#A7066A]" />
              New Purchase Request
            </h1>
            <p className="text-xs text-[#6B5A64]">
              Create a stock purchase requisition for Stock Admin approval.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs py-1 px-3">
          Status: PENDING APPROVAL
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Details Card */}
        <Card className="border-brand-border shadow-sm rounded-2xl">
          <CardHeader className="bg-slate-50/70 border-b border-brand-border py-4">
            <CardTitle className="text-sm font-bold text-[#1F1720] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#A7066A]" />
              Purchase Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* PO Request No. Preview */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  PO Request No.
                </Label>
                <Input
                  value={`POR-${new Date().getFullYear()}-Auto`}
                  disabled
                  className="bg-slate-100 font-mono font-bold text-slate-600 h-11 border-slate-200"
                />
                <p className="text-[10px] text-slate-400">Auto-generated sequence code</p>
              </div>

              {/* Request Date */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Request Date
                </Label>
                <Input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="h-11 border-brand-border"
                />
              </div>

              {/* Requested By */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Requested By
                </Label>
                <Input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  required
                  className="h-11 border-brand-border font-medium"
                />
              </div>

              {/* Warehouse (Repositories only, no outlets) */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Warehouse
                </Label>
                <Select
                  value={branchId}
                  onValueChange={(val) => {
                    setBranchId(val);
                    const selected = repositories.find((r: any) => r.id === val);
                    setBranchName(selected ? selected.name : "Main Warehouse");
                  }}
                >
                  <SelectTrigger className="h-11 border-brand-border">
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Warehouse</SelectItem>
                    {repositories.map((repo: any) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Selection (System Suppliers) */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider flex items-center justify-between">
                  <span>Supplier *</span>
                  {suppliersLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </Label>
                <Select value={supplierId} onValueChange={setSupplierId} required>
                  <SelectTrigger className="h-11 border-brand-border font-semibold text-[#1F1720]">
                    <SelectValue placeholder="Select Supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No suppliers registered
                      </SelectItem>
                    ) : (
                      suppliers.map((sup: any) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name} ({sup.contactName})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Request Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Request Type
                </Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger className="h-11 border-brand-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTOCK">Restock</SelectItem>
                    <SelectItem value="NEW_STOCK">New Stock</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Priority
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-11 border-brand-border font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expected Delivery Date */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Expected Delivery Date
                </Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="h-11 border-brand-border"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Remarks / Justification
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Low stock due to high demand in recent promotion"
                  rows={2}
                  className="border-brand-border text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card className="border-brand-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-brand-border py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#1F1720] uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-[#A7066A]" />
              Items Section
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Quick Pick Existing Catalog Product */}
              <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1">
                    <Search className="w-3.5 h-3.5" />
                    Pick Existing Product
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-80" align="end">
                  <Command>
                    <CommandInput placeholder="Search catalog product…" />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup heading="Catalog Products">
                        {existingProducts.slice(0, 15).map((prod: any) => (
                          <CommandItem
                            key={prod.id}
                            onSelect={() => handleSelectExistingProduct(prod)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{prod.name}</span>
                              <span className="text-[11px] text-slate-400">
                                SKU: {prod.sku || "N/A"} | Cost: {formatPrice(prod.costPrice || prod.price)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                className="h-9 text-xs font-semibold gap-1 bg-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Row
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-100/70 border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase w-[220px]">
                      Item Name *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase w-[130px]">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-[#6B5A64] uppercase w-[100px]">
                      Qty *
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-[#6B5A64] uppercase w-[110px]">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[#6B5A64] uppercase w-[140px]">
                      Est. Unit Cost (LKR)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#6B5A64] uppercase">
                      Reason / Notes
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-[#6B5A64] uppercase w-[60px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50 bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <Input
                          value={item.itemName}
                          onChange={(e) => handleItemChange(item.id, "itemName", e.target.value)}
                          placeholder="e.g. Harry Potter Book"
                          required
                          className="h-10 text-sm font-semibold border-brand-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.sku}
                          onChange={(e) => handleItemChange(item.id, "sku", e.target.value)}
                          placeholder="e.g. HP001"
                          className="h-10 text-xs font-mono border-brand-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="1"
                          value={item.requestedQty}
                          onChange={(e) =>
                            handleItemChange(item.id, "requestedQty", Math.max(1, Number(e.target.value) || 1))
                          }
                          required
                          className="h-10 text-center font-bold text-sm border-brand-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                          placeholder="Books / Pcs"
                          className="h-10 text-center text-xs border-brand-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.estimatedUnitCost}
                          onChange={(e) =>
                            handleItemChange(item.id, "estimatedUnitCost", Math.max(0, Number(e.target.value) || 0))
                          }
                          className="h-10 text-right font-bold text-sm border-brand-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.reason}
                          onChange={(e) => handleItemChange(item.id, "reason", e.target.value)}
                          placeholder="e.g. Stock below reorder level"
                          className="h-10 text-xs border-brand-border"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="bg-slate-50 p-4 border-t border-brand-border flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B5A64] uppercase tracking-wider">
                Total Estimated Order Cost
              </span>
              <span className="text-xl font-black text-[#A7066A]">
                {formatPrice(totalEstimatedCost)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/admin/purchase-orders">
            <Button variant="outline" type="button" className="h-12 px-6 font-semibold">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 font-bold bg-[#A7066A] hover:bg-[#8A0558] text-white gap-2 shadow-lg shadow-pink-200/50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Requisition…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Submit Request for Approval
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
