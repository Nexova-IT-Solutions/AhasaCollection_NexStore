"use client";

import { useEffect, useState, useCallback } from "react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  userName: string;
  createdAt: string;
}

interface ReviewListProps {
  productId: string;
  refreshTrigger: number;
}

export function ReviewList({ productId, refreshTrigger }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReviews = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/products/${productId}/reviews?page=${pageNum}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        if (isLoadMore) {
          setReviews(prev => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [productId]);

  useEffect(() => {
    setPage(1);
    fetchReviews(1);
  }, [fetchReviews, refreshTrigger]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  };

  if (loading && page === 1) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#F3EDF1] animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border bg-[#F3EDF1]/30 p-10 text-center">
        <p className="text-[#6B5A64]">No reviews yet for this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {reviews.map((review) => (
          <article key={review.id} className="pb-6 border-b border-brand-border last:border-0">
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#1F1720]">{review.userName}</span>
                  <span className="text-xs text-[#6B5A64]">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                <StarRating rating={review.rating} starClassName="h-4 w-4" />
              </div>
            </div>

            {review.comment && (
              <p className="text-[#1F1720] text-sm leading-relaxed mb-4">
                {review.comment}
              </p>
            )}

            {review.images.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {review.images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-brand-border bg-[#FCEAF4]">
                    <Image 
                      src={img} 
                      alt={`Review image ${i}`} 
                      fill 
                      className="object-cover cursor-pointer hover:scale-110 transition-transform" 
                      onClick={() => window.open(img, '_blank')}
                    />
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Reviews"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
