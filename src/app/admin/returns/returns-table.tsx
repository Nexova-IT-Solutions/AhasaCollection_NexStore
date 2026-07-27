"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Undo2,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Link from "next/link";
import { resolveStorageUrl } from "@/lib/utils";
import { ReusablePagination } from "@/components/admin/reusable-pagination";

type ReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "REFUNDED";
  images: string[];
  createdAt: string;
  adminNote?: string | null;
};

interface ReturnsTableProps {
  returns: ReturnRequest[];
  locale: string;
  totalCount: number;
  currentPage: number;
  limit: number;
}

export function ReturnsTable({ 
  returns, 
  locale,
  totalCount,
  currentPage,
  limit
}: ReturnsTableProps) {
  const router = useRouter();
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"ACCEPTED" | "REJECTED" | "REFUNDED" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [shouldRestock, setShouldRestock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewImages, setViewImages] = useState<string[] | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const handleAction = async () => {
    if (!selectedReturn || !actionType) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/returns/${selectedReturn.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: actionType, 
          adminNote,
          shouldRestock: actionType === "ACCEPTED" ? shouldRestock : false
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Return request ${actionType.toLowerCase()} successfully`);
      setIsActionModalOpen(false);
      setSelectedReturn(null);
      setAdminNote("");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
            <TableHead className="w-[150px] font-bold text-slate-700">Date</TableHead>
            <TableHead className="font-bold text-slate-700">Order</TableHead>
            <TableHead className="font-bold text-slate-700">Customer</TableHead>
            <TableHead className="max-w-[300px] font-bold text-slate-700">Reason</TableHead>
            <TableHead className="font-bold text-slate-700">Status</TableHead>
            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                No return requests found.
              </TableCell>
            </TableRow>
          ) : (
            returns.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                <TableCell className="font-medium text-slate-600">
                  {format(new Date(item.createdAt), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/orders/${item.orderId}`}
                    className="flex items-center gap-1 text-[#A7066A] hover:underline font-mono text-sm font-bold"
                  >
                    {item.orderNumber}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TableCell>
                <TableCell className="font-semibold text-slate-800">{item.customerName}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <p className="line-clamp-2 text-sm text-slate-600 leading-relaxed">{item.reason}</p>
                    {item.images.length > 0 && (
                      <button
                        onClick={() => setViewImages(item.images)}
                        className="flex w-fit items-center gap-1.5 text-[11px] font-bold text-[#A7066A] bg-[#FCEAF4] px-2 py-0.5 rounded-full hover:bg-[#A7066A] hover:text-white transition-all"
                      >
                        <Eye className="h-3 w-3" />
                        View {item.images.length} Photos
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-xl border-slate-100">
                      <DropdownMenuLabel className="text-xs font-bold text-slate-400">Manage Request</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedReturn(item);
                          setActionType("ACCEPTED");
                          setAdminNote(item.adminNote || "");
                          setIsActionModalOpen(true);
                        }}
                        disabled={item.status !== "PENDING"}
                        className="text-emerald-600 focus:text-emerald-600 font-medium cursor-pointer"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept Return
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedReturn(item);
                          setActionType("REJECTED");
                          setAdminNote(item.adminNote || "");
                          setIsActionModalOpen(true);
                        }}
                        disabled={item.status !== "PENDING"}
                        className="text-rose-600 focus:text-rose-600 font-medium cursor-pointer"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Return
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-50" />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedReturn(item);
                          setActionType("REFUNDED");
                          setAdminNote(item.adminNote || "");
                          setIsActionModalOpen(true);
                        }}
                        disabled={item.status !== "ACCEPTED"}
                        className="text-blue-600 focus:text-blue-600 font-medium cursor-pointer"
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Mark Refunded
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <ReusablePagination 
        totalItems={totalCount}
        itemsPerPage={limit}
        currentPage={currentPage}
        pageParamKey="page"
        limitParamKey="limit"
      />

      {/* Action Dialog */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="rounded-3xl sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {actionType === "ACCEPTED" ? "Accept Return" : 
               actionType === "REJECTED" ? "Reject Return" : "Issue Refund"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Order: <span className="font-mono font-bold text-slate-900">{selectedReturn?.orderNumber}</span>. Provide an optional note for the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminNote" className="text-sm font-bold text-slate-700">Admin Note</Label>
              <Textarea
                id="adminNote"
                placeholder="Explain the decision or provide instructions..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="h-32 rounded-2xl border-slate-200 focus-visible:ring-[#A7066A] transition-all"
              />
            </div>

            {actionType === "ACCEPTED" && (
              <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <Checkbox 
                  id="restock" 
                  checked={shouldRestock} 
                  onCheckedChange={(checked) => setShouldRestock(checked === true)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="restock"
                    className="text-sm font-bold leading-none text-emerald-900 cursor-pointer"
                  >
                    Restock Items?
                  </Label>
                  <p className="text-[11px] text-emerald-700/80 font-medium">
                    Automatically increment product stock for items in this order.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Return Evidence Attachments
              </span>
              {selectedReturn?.images && selectedReturn.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {selectedReturn.images.map((imgUrl, idx) => {
                    const finalSrc = resolveStorageUrl(imgUrl);
                    return (
                      <a
                        key={`${selectedReturn.id}-${idx}`}
                        href={finalSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="relative w-24 h-24 border rounded-md overflow-hidden bg-muted hover:opacity-90 transition block bg-slate-100"
                      >
                        <img
                          src={finalSrc}
                          alt={`Evidence ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-product.png";
                          }}
                        />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">No evidence images uploaded by customer.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsActionModalOpen(false)} className="rounded-xl font-semibold">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              className={`rounded-xl font-bold px-8 shadow-lg transition-all active:scale-95 ${
                actionType === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" :
                actionType === "REJECTED" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {isSubmitting ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!viewImages} onOpenChange={(open) => {
        if (!open) {
          setViewImages(null);
          setImageErrors({});
        }
      }}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Return Evidence Images</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-4 max-h-[60vh] overflow-y-auto p-1">
            {viewImages?.map((url, i) => {
              const fallbackPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23A7066A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";
              const src = imageErrors[i]
                ? fallbackPlaceholder
                : resolveStorageUrl(url);
              return (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="relative w-48 h-48 sm:w-64 sm:h-64 border rounded-xl overflow-hidden bg-slate-50 transition hover:opacity-90 block"
                >
                  <img
                    src={src}
                    alt={`Evidence ${i}`}
                    referrerPolicy="no-referrer"
                    className="object-contain w-full h-full bg-slate-100/50"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [i]: true }));
                    }}
                  />
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "ACCEPTED":
      return (
        <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
          <CheckCircle2 className="h-3 w-3" />
          Accepted
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-rose-50 text-rose-700 border-rose-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case "REFUNDED":
      return (
        <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200 px-2.5 py-1 rounded-full font-bold text-[11px]">
          <Undo2 className="h-3 w-3" />
          Refunded
        </Badge>
      );
    default:
      return <Badge className="rounded-full">{status}</Badge>;
  }
}
