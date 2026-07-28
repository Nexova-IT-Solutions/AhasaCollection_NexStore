"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  PackageCheck,
  Building2,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Plus,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Package,
  Layers,
  Calendar,
  User,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { useCurrency } from "@/components/CurrencyProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WORKFLOW_STEPS = [
  { status: "PENDING_APPROVAL", label: "Request Submitted" },
  { status: "APPROVED", label: "Approved by Stock Admin" },
  { status: "GOODS_RECEIVED", label: "Goods Received (GRN)" },
  { status: "REVIEWING", label: "Inventory Intake Review" },
  { status: "COMPLETED", label: "Stock Added to Inventory" },
];

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { data: session } = useSession();

  const { data, isLoading, mutate } = useSWR(`/api/admin/purchase-orders/${id}`, fetcher);
  const { data: categoriesData } = useSWR("/api/admin/categories?limit=500", fetcher);

  const po = data?.purchaseOrder;
  const categories = Array.isArray(categoriesData?.data)
    ? categoriesData.data
    : (Array.isArray(categoriesData?.categories)
      ? categoriesData.categories
      : (Array.isArray(categoriesData) ? categoriesData : []));

  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Workflow processing spinners
  const [isApproving, setIsApproving] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isIntaking, setIsIntaking] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Goods Receiving form state
  const [invoiceNo, setInvoiceNo] = useState("");
  const [deliveryNoteNo, setDeliveryNoteNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CREDIT");
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [paymentRefNo, setPaymentRefNo] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveDamagedNotes, setReceiveDamagedNotes] = useState("");
  const [receivedItemsState, setReceivedItemsState] = useState<any[]>([]);

  // Intake review state
  const [intakeItemsState, setIntakeItemsState] = useState<any[]>([]);

  // Payment modal state
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRefNo, setPayRefNo] = useState("");
  const [payNotes, setPayNotes] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading Purchase Order details…
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Purchase Order Not Found</h2>
        <Link href="/admin/purchase-orders">
          <Button variant="outline">Back to Purchase Orders</Button>
        </Link>
      </div>
    );
  }

  // Stock Admin Approval Handler
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Approval failed");

      toast({
        title: "Purchase Order Approved",
        description: "Status changed to Approved. PDF Purchase Request is now ready for download.",
      });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  // Stock Admin Rejection Handler
  const handleReject = async () => {
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", rejectionReason }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Rejection failed");

      toast({
        title: "Purchase Order Rejected",
        description: "Rejection status recorded.",
      });
      setRejectModalOpen(false);
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Open Receiving Goods Modal
  const openReceiveModal = () => {
    setReceivedItemsState(
      (po.items || []).map((item: any) => ({
        poItemId: item.id,
        itemName: item.itemName,
        sku: item.sku,
        requestedQty: item.requestedQty,
        receivedQty: item.requestedQty,
        damagedQty: 0,
        finalUnitCost: item.estimatedUnitCost,
      }))
    );
    setReceiveModalOpen(true);
  };

  // Submit Goods Receiving
  const handleReceiveGoodsSubmit = async () => {
    setIsReceiving(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          deliveryNoteNo,
          paymentMethod,
          paidAmount: initialPaidAmount,
          referenceNo: paymentRefNo,
          notes: receiveNotes,
          damagedNotes: receiveDamagedNotes,
          receivedItems: receivedItemsState,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Goods receiving failed");

      toast({
        title: "Goods Received Recorded",
        description: resData.message,
      });
      setReceiveModalOpen(false);
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsReceiving(false);
    }
  };

  // Open Inventory Review & Intake Modal
  const openIntakeModal = () => {
    const initializedState = (po.items || []).map((item: any) => ({
      poItemId: item.id,
      productId: item.productId || null,
      itemName: item.itemName,
      sku: item.sku || "",
      acceptedQty: item.acceptedQty || item.receivedQty || item.requestedQty,
      costPrice: item.finalUnitCost || item.estimatedUnitCost,
      sellingPrice: (item.finalUnitCost || item.estimatedUnitCost) * 1.25,
      categoryId: "",
      imageUrl: "",
      shortDescription: "",
      description: "",
      weightGrams: "",
      rackNumber: "",
      rowNumber: "",
      binLocation: "",
      isbn: "",
      author: "",
      publisher: "",
      isNewArrival: false,
      isTrending: false,
      isTopRated: false,
      isBestSeller: false,
      showInDiscountSection: false,
      showInChocolateSection: false,
      showInSoftToysSection: false,
    }));

    setIntakeItemsState(initializedState);

    // Expand items by default if only 1 item, or expand first item
    const initialExpanded: Record<string, boolean> = {};
    if (initializedState.length > 0) {
      initializedState.forEach((it: any, idx: number) => {
        initialExpanded[it.poItemId] = idx === 0 || initializedState.length === 1;
      });
    }
    setExpandedItems(initialExpanded);
    setIntakeModalOpen(true);
  };

  // Submit Inventory Intake
  const handleInventoryIntakeSubmit = async () => {
    setIsIntaking(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemsIntake: intakeItemsState,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Inventory intake failed");

      toast({
        title: "Stock Added to Inventory!",
        description: "Products have been updated and stock is live.",
      });
      setIntakeModalOpen(false);
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsIntaking(false);
    }
  };

  // Submit Payment
  const handlePaymentSubmit = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmount,
          paymentMethod: payMethod,
          referenceNo: payRefNo,
          notes: payNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Payment failed");

      toast({
        title: "Payment Recorded",
        description: "Supplier payment updated successfully.",
      });
      setPaymentModalOpen(false);
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  const getStepIndex = (st: string) => {
    switch (st) {
      case "PENDING_APPROVAL":
        return 0;
      case "APPROVED":
        return 1;
      case "GOODS_RECEIVED":
        return 2;
      case "REVIEWING":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return -1;
    }
  };

  const canApprove = hasPermission(session, "purchase_orders.approve") || hasPermission(session, "catalog.stock_admin");
  const canReceive = hasPermission(session, "purchase_orders.receive") || hasPermission(session, "catalog.manage_inventory");
  const canIntake = hasPermission(session, "purchase_orders.inventory_intake") || hasPermission(session, "catalog.manage_products");
  const canPay = hasPermission(session, "purchase_orders.payment") || hasPermission(session, "catalog.stock_admin");

  const currentStepIdx = getStepIndex(po.status);
  const totalCost = po.finalCost ?? po.totalEstimatedCost;
  const balanceDue = Math.max(0, totalCost - po.paidAmount);

  return (
    <div className="space-y-6 p-6 max-w-[1350px] mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/purchase-orders">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-[#1F1720]">
                {po.poNumber}
              </h1>
              <Badge
                variant="outline"
                className={`font-bold text-xs uppercase ${
                  po.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : po.status === "REJECTED"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : po.status === "APPROVED"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {po.status?.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-[#6B5A64] mt-0.5">
              Requested by <span className="font-semibold text-slate-800">{po.requestedByName}</span> on{" "}
              {new Date(po.requestDate).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF Button */}
          {["APPROVED", "GOODS_RECEIVED", "REVIEWING", "COMPLETED"].includes(po.status) && (
            <a href={`/api/admin/purchase-orders/${po.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-slate-700">
                <Download className="w-4 h-4 text-blue-600" />
                Download PDF Request
              </Button>
            </a>
          )}

          {/* Receive Goods Button */}
          {["APPROVED", "GOODS_RECEIVED", "REVIEWING"].includes(po.status) && canReceive && (
            <Button
              onClick={openReceiveModal}
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <PackageCheck className="w-4 h-4" />
              Receive Goods (GRN)
            </Button>
          )}

          {/* Inventory Intake Button */}
          {["GOODS_RECEIVED", "REVIEWING"].includes(po.status) && canIntake && (
            <Button
              onClick={openIntakeModal}
              size="sm"
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              <Layers className="w-4 h-4" />
              Review & Intake to Inventory
            </Button>
          )}

          {/* Add Payment Button */}
          {["APPROVED", "GOODS_RECEIVED", "REVIEWING", "COMPLETED"].includes(po.status) && balanceDue > 0 && canPay && (
            <Button
              onClick={() => {
                setPayAmount(balanceDue);
                setPaymentModalOpen(true);
              }}
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CreditCard className="w-4 h-4" />
              Record Supplier Payment
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Progress Tracker */}
      {po.status !== "REJECTED" && po.status !== "CANCELLED" && (
        <Card className="border-brand-border shadow-sm rounded-2xl p-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isDone = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;

              return (
                <div key={step.status} className="flex items-center gap-3 flex-1 w-full">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      isDone
                        ? "bg-[#A7066A] text-white shadow-sm"
                        : "bg-slate-200 text-slate-500"
                    } ${isCurrent ? "ring-4 ring-pink-100" : ""}`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold ${
                        isDone ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {isCurrent ? "In Progress" : isDone ? "Completed" : "Next"}
                    </span>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className="hidden md:block flex-1 h-0.5 bg-slate-200 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Stock Admin Approval Action Banner */}
      {po.status === "PENDING_APPROVAL" && canApprove && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Stock Admin Approval Required
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Review the items and estimated costs below. Once approved, purchase requests can be downloaded as PDF.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(true)}
                className="border-red-200 text-red-700 hover:bg-red-50 font-semibold"
              >
                Reject Request
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold gap-1.5"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve Purchase Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details & Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Item Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Details Card */}
          <Card className="border-brand-border shadow-sm rounded-2xl">
            <CardHeader className="bg-slate-50/60 border-b border-brand-border py-4">
              <CardTitle className="text-sm font-bold text-[#1F1720] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#A7066A]" />
                Order Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Warehouse
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {po.outletName || "Main Warehouse"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Request Type
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {po.requestType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Priority
                </span>
                <Badge
                  variant="outline"
                  className={`mt-0.5 font-bold uppercase text-[10px] ${
                    po.priority === "URGENT" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {po.priority}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Expected Delivery
                </span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {po.expectedDeliveryDate
                    ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-GB")
                    : "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Approved By
                </span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {po.approvedByName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                  Payment Status
                </span>
                <Badge
                  variant="outline"
                  className={`mt-0.5 font-bold text-[10px] ${
                    po.paymentStatus === "FULLY_PAID"
                      ? "bg-emerald-50 text-emerald-700"
                      : po.paymentStatus === "PARTIALLY_PAID"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {po.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Requested Items Table */}
          <Card className="border-brand-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-brand-border py-4">
              <CardTitle className="text-sm font-bold text-[#1F1720] uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#A7066A]" />
                Requested Items ({po.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="bg-slate-100/70 border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-[#6B5A64] uppercase">Item Name</th>
                      <th className="px-4 py-3 text-left font-bold text-[#6B5A64] uppercase">SKU</th>
                      <th className="px-4 py-3 text-center font-bold text-[#6B5A64] uppercase">Req Qty</th>
                      <th className="px-4 py-3 text-center font-bold text-[#6B5A64] uppercase">Rec Qty</th>
                      <th className="px-4 py-3 text-center font-bold text-[#6B5A64] uppercase">Damaged</th>
                      <th className="px-4 py-3 text-right font-bold text-[#6B5A64] uppercase">Unit Cost</th>
                      <th className="px-4 py-3 text-right font-bold text-[#6B5A64] uppercase">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/50 bg-white">
                    {po.items?.map((item: any) => {
                      const cost = item.finalUnitCost ?? item.estimatedUnitCost;
                      const lineTotal = (item.acceptedQty || item.requestedQty) * cost;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {item.itemName}
                            {item.reason && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Reason: {item.reason}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{item.sku || "—"}</td>
                          <td className="px-4 py-3 text-center font-bold">{item.requestedQty} {item.unit}</td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-700">
                            {item.receivedQty || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-red-600">
                            {item.damagedQty || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatPrice(cost)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatPrice(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Supplier Info & Payment Card */}
        <div className="space-y-6">
          {/* Supplier Card */}
          <Card className="border-brand-border shadow-sm rounded-2xl">
            <CardHeader className="bg-slate-50/60 border-b border-brand-border py-4">
              <CardTitle className="text-sm font-bold text-[#1F1720] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#A7066A]" />
                Supplier Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Company Name</span>
                <span className="font-bold text-slate-800 text-sm">{po.supplier?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Contact Person</span>
                <span className="font-semibold text-slate-700">{po.supplier?.contactName || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Phone / Email</span>
                <span className="font-mono text-slate-600 block">{po.supplier?.phoneNumber}</span>
                <span className="text-slate-500 block truncate">{po.supplier?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cost & Payment Balance Card */}
          <Card className="border-brand-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-pink-400" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Total Order Cost:</span>
                <span className="font-bold text-sm text-slate-900">{formatPrice(totalCost)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Paid Amount:</span>
                <span className="font-bold text-sm text-emerald-600">{formatPrice(po.paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-800 font-bold">Outstanding Balance:</span>
                <span className="font-black text-base text-[#A7066A]">{formatPrice(balanceDue)}</span>
              </div>

              {balanceDue > 0 && (
                <Button
                  onClick={() => {
                    setPayAmount(balanceDue);
                    setPaymentModalOpen(true);
                  }}
                  className="w-full mt-3 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold"
                >
                  Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Logs List */}
          {po.payments && po.payments.length > 0 && (
            <Card className="border-brand-border shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/60 border-b border-brand-border py-3">
                <CardTitle className="text-xs font-bold text-[#1F1720] uppercase tracking-wider">
                  Payment History ({po.payments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {po.payments.map((p: any) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{p.paymentMethod}</span>
                      <span className="text-emerald-700">{formatPrice(p.amount)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(p.paidAt).toLocaleString("en-GB")} | By {p.paidByName}
                    </p>
                    {p.referenceNo && (
                      <p className="text-[10px] text-slate-500 font-mono">Ref: {p.referenceNo}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Purchase Order Request</DialogTitle>
            <DialogDescription>
              Specify the reason for rejecting request {po.poNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold uppercase">Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Estimated costs exceed budget limits for this quarter"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Goods Modal (GRN) */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-600" />
              Goods Receiving Note (GRN) & Damage Tracking
            </DialogTitle>
            <DialogDescription>
              Record received quantities, damaged items, delivery notes, and cost updates for {po.poNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase">Invoice No.</Label>
                <Input
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-99882"
                  className="h-10 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Delivery Note No.</Label>
                <Input
                  value={deliveryNoteNo}
                  onChange={(e) => setDeliveryNoteNo(e.target.value)}
                  placeholder="e.g. DN-44321"
                  className="h-10 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">Credit (Pay Later)</SelectItem>
                    <SelectItem value="CASH">Cash Purchase</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Item Receiving Table */}
            <div className="border border-brand-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-center w-16">Req Qty</th>
                    <th className="px-3 py-2 text-center w-24">Rec Qty</th>
                    <th className="px-3 py-2 text-center w-24">Damaged</th>
                    <th className="px-3 py-2 text-right w-28">Final Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {receivedItemsState.map((recItem, idx) => (
                    <tr key={recItem.poItemId}>
                      <td className="px-3 py-2 font-semibold">
                        {recItem.itemName}
                        <span className="block text-[10px] text-slate-400 font-mono">{recItem.sku}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-600">
                        {recItem.requestedQty}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={recItem.receivedQty}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setReceivedItemsState((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, receivedQty: val } : item))
                            );
                          }}
                          className="h-8 text-center font-bold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={recItem.damagedQty}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setReceivedItemsState((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, damagedQty: val } : item))
                            );
                          }}
                          className="h-8 text-center font-bold text-red-600 bg-red-50/50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={recItem.finalUnitCost}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setReceivedItemsState((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, finalUnitCost: val } : item))
                            );
                          }}
                          className="h-8 text-right font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase">Receiving Notes</Label>
                <Textarea
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Notes regarding delivery, driver, etc."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase">Damaged Goods Notes</Label>
                <Textarea
                  value={receiveDamagedNotes}
                  onChange={(e) => setReceiveDamagedNotes(e.target.value)}
                  placeholder="Describe damage details or carton defects"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReceiveGoodsSubmit}
              disabled={isReceiving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isReceiving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Goods Receipt (GRN)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Inventory Intake Modal */}
      <Dialog open={intakeModalOpen} onOpenChange={setIntakeModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#1F1720]">
              <Layers className="w-5 h-5 text-purple-600" />
              Review & Intake Received Items to Inventory
            </DialogTitle>
            <DialogDescription>
              Configure category, selling prices, descriptions, location, and flags for all items before ingesting stock into catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {intakeItemsState.map((item, idx) => {
              const isExpanded = expandedItems[item.poItemId] ?? (intakeItemsState.length === 1);
              return (
                <Card key={item.poItemId} className="border-brand-border rounded-2xl overflow-hidden shadow-sm">
                  {/* Collapsible Card Header */}
                  <div
                    onClick={() =>
                      setExpandedItems((prev) => ({
                        ...prev,
                        [item.poItemId]: !prev[item.poItemId],
                      }))
                    }
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between transition-colors border-b border-brand-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.itemName}</span>
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                            Qty to Intake: {item.acceptedQty} Pcs
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>Cost: <strong className="text-slate-700">{formatPrice(item.costPrice)}</strong></span>
                          <span>Selling: <strong className="text-emerald-600">{formatPrice(item.sellingPrice)}</strong></span>
                          {item.categoryId && (
                            <span className="text-purple-600 font-semibold">
                              • {categories.find((c: any) => c.id === item.categoryId)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-[11px] font-semibold hidden sm:inline">
                        {isExpanded ? "Collapse" : "Expand Details"}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Card Content (When Expanded) */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white">
                      {/* Section 1: Basic Information */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          1. Core Product Info
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Category *</Label>
                            <Select
                              value={item.categoryId}
                              onValueChange={(val) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, categoryId: val } : it))
                                )
                              }
                            >
                              <SelectTrigger className="h-9 text-xs mt-1 border-brand-border">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Selling Price (LKR) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.sellingPrice}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, sellingPrice: val } : it))
                                );
                              }}
                              className="h-9 text-right font-bold mt-1 border-brand-border"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Catalog SKU</Label>
                            <Input
                              value={item.sku}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, sku: e.target.value } : it))
                                )
                              }
                              placeholder="e.g. HP001"
                              className="h-9 font-mono text-xs mt-1 border-brand-border"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Cost Price (LKR)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.costPrice}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, costPrice: val } : it))
                                );
                              }}
                              className="h-9 text-right font-semibold mt-1 border-brand-border"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Main Image URL</Label>
                            <Input
                              value={item.imageUrl}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, imageUrl: e.target.value } : it))
                                )
                              }
                              placeholder="https://example.com/product-image.jpg"
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Descriptions */}
                      <div className="pt-2 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                          2. Descriptions & Copy
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Short Description</Label>
                            <Textarea
                              value={item.shortDescription}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, shortDescription: e.target.value } : it))
                                )
                              }
                              placeholder="Brief summary for product card..."
                              rows={2}
                              className="mt-1 text-xs border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Full Description</Label>
                            <Textarea
                              value={item.description}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it))
                                )
                              }
                              placeholder="Detailed product specification..."
                              rows={2}
                              className="mt-1 text-xs border-brand-border"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Physical Storage & Weight */}
                      <div className="pt-2 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                          3. Physical Location & Weight
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Weight (g)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="e.g. 350"
                              value={item.weightGrams}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, weightGrams: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Rack Number</Label>
                            <Input
                              placeholder="e.g. RACK-04"
                              value={item.rackNumber}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, rackNumber: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Row Location</Label>
                            <Input
                              placeholder="e.g. ROW-B"
                              value={item.rowNumber}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, rowNumber: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Bin Location</Label>
                            <Input
                              placeholder="e.g. BIN-12"
                              value={item.binLocation}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, binLocation: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Barcode & Publishing Metadata */}
                      <div className="pt-2 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                          4. Barcode & Publishing (Optional)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Barcode / ISBN</Label>
                            <Input
                              placeholder="e.g. 9780547928227"
                              value={item.isbn}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isbn: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Author</Label>
                            <Input
                              placeholder="e.g. J.K. Rowling"
                              value={item.author}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, author: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-slate-600">Publisher</Label>
                            <Input
                              placeholder="e.g. Bloomsbury"
                              value={item.publisher}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, publisher: e.target.value } : it))
                                )
                              }
                              className="h-9 text-xs mt-1 border-brand-border"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 5: Storefront Display Flags */}
                      <div className="pt-2 border-t border-slate-100">
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                          5. Storefront Badges & Sections
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isNewArrival}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isNewArrival: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Is New Arrival</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isTrending}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isTrending: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Is Trending</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isTopRated}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isTopRated: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Is Top Rated</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isBestSeller}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isBestSeller: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Is Best Seller</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.showInDiscountSection}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, showInDiscountSection: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Discount Section</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.showInChocolateSection}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, showInChocolateSection: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Chocolate Section</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.showInSoftToysSection}
                              onChange={(e) =>
                                setIntakeItemsState((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, showInSoftToysSection: e.target.checked } : it))
                                )
                              }
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Soft Toys Section</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIntakeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInventoryIntakeSubmit}
              disabled={isIntaking}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {isIntaking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Ingest Stock to Catalog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Record Supplier Payment
            </DialogTitle>
            <DialogDescription>
              Record payment settlement for {po.poNumber} (Supplier: {po.supplier?.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold uppercase">Payment Amount (LKR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-10 text-right font-bold text-sm mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase">Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-10 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CREDIT">Credit Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase">Reference / Cheque No.</Label>
              <Input
                value={payRefNo}
                onChange={(e) => setPayRefNo(e.target.value)}
                placeholder="e.g. CHQ-998822 or Bank Ref #1122"
                className="h-10 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase">Payment Notes</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Additional details regarding payment settlement"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={isPaying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
