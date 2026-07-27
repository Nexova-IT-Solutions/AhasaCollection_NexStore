"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Star, 
  Search, 
  Filter, 
  MoreVertical,
  ExternalLink,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ReusablePagination } from "@/components/admin/reusable-pagination";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  images: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  product: {
    name: string;
    image: string | null;
  };
  user: {
    name: string | null;
    email: string | null;
  };
}

export function ReviewsAdminClient() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1") || 1;
  const limit = parseInt(searchParams.get("limit") || "10") || 10;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
        setTotalCount(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setIsActionLoading(id);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "APPROVE" ? "APPROVED" : "REJECTED" }),
      });

      if (response.ok) {
        toast({
          title: action === "APPROVE" ? "Review Approved" : "Review Rejected",
          description: `The review has been ${action.toLowerCase()}ed successfully.`,
        });
        fetchReviews();
        if (selectedReview?.id === id) setIsDetailOpen(false);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Action failed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1720]">Customer Reviews</h1>
          <p className="text-sm text-[#6B5A64]">Moderate and manage product reviews</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-brand-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or customer name..."
            className="pl-9 border-brand-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-brand-border">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F3EDF1]/50">
              <TableHead className="font-bold text-[#1F1720]">Product</TableHead>
              <TableHead className="font-bold text-[#1F1720]">Customer</TableHead>
              <TableHead className="font-bold text-[#1F1720]">Rating</TableHead>
              <TableHead className="font-bold text-[#1F1720] hidden md:table-cell">Comment</TableHead>
              <TableHead className="font-bold text-[#1F1720]">Status</TableHead>
              <TableHead className="font-bold text-[#1F1720]">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="h-16">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 animate-pulse rounded-md" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-md" />
                        <div className="h-3 w-24 bg-slate-100 animate-pulse rounded-md" />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id} className="hover:bg-[#F3EDF1]/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 relative rounded-md overflow-hidden bg-slate-50 border border-slate-100">
                        {review.product.image ? (
                          <Image src={review.product.image} alt={review.product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-brand-light/10 text-brand-primary text-[10px]">
                            No img
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-[#1F1720] line-clamp-1 max-w-[150px]">{review.product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-[#1F1720]">{review.user.name || "Unknown"}</span>
                      <span className="text-[10px] text-[#6B5A64]">{review.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-xs text-[#6B5A64] line-clamp-2 max-w-[200px]">
                      {review.comment || <span className="italic opacity-50">No comment</span>}
                    </p>
                  </TableCell>
                  <TableCell>{getStatusBadge(review.status)}</TableCell>
                  <TableCell className="text-xs text-[#6B5A64]">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedReview(review); setIsDetailOpen(true); }}>
                          <MessageSquare className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {review.status === "PENDING" && (
                          <>
                            <DropdownMenuItem 
                              className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                              onClick={() => handleAction(review.id, "APPROVE")}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              onClick={() => handleAction(review.id, "REJECT")}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {review.status === "APPROVED" && (
                          <DropdownMenuItem 
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                            onClick={() => handleAction(review.id, "REJECT")}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject Review
                          </DropdownMenuItem>
                        )}
                        {review.status === "REJECTED" && (
                          <DropdownMenuItem 
                            className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                            onClick={() => handleAction(review.id, "APPROVE")}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Review
                          </DropdownMenuItem>
                        )}
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
          currentPage={page}
          pageParamKey="page"
          limitParamKey="limit"
        />
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Detailed information about this customer feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="h-16 w-16 relative rounded-lg overflow-hidden border border-white shadow-sm">
                  {selectedReview.product.image ? (
                    <Image src={selectedReview.product.image} alt={selectedReview.product.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-brand-light/10" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#1F1720]">{selectedReview.product.name}</h4>
                  <p className="text-xs text-[#6B5A64]">Category: Gift Box</p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < selectedReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                </div>
                <div>
                  {getStatusBadge(selectedReview.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-[#1F1720] mb-1">Customer</h5>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#A7066A] text-white flex items-center justify-center text-xs font-bold">
                      {selectedReview.user.name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedReview.user.name}</p>
                      <p className="text-xs text-[#6B5A64]">{selectedReview.user.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-[#1F1720] mb-1">Comment</h5>
                  <p className="text-sm text-[#1F1720] bg-[#F3EDF1]/30 p-4 rounded-xl italic leading-relaxed border border-brand-border/50">
                    "{selectedReview.comment || "No comment provided."}"
                  </p>
                </div>

                {selectedReview.images.length > 0 && (
                  <div>
                    <h5 className="text-sm font-bold text-[#1F1720] mb-2">Attached Images</h5>
                    <div className="flex flex-wrap gap-3">
                      {selectedReview.images.map((img, i) => (
                        <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-brand-border group">
                          <Image src={img} alt={`Review ${i}`} fill className="object-cover" />
                          <button 
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            onClick={() => window.open(img, '_blank')}
                          >
                            <ExternalLink className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-brand-border">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                {selectedReview.status === "PENDING" && (
                  <>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAction(selectedReview.id, "APPROVE")}
                      disabled={isActionLoading === selectedReview.id}
                    >
                      {isActionLoading === selectedReview.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Review"}
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleAction(selectedReview.id, "REJECT")}
                      disabled={isActionLoading === selectedReview.id}
                    >
                      {isActionLoading === selectedReview.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject Review"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
