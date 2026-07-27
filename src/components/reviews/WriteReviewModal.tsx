"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { uploadFile } from "@/utils/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, X } from "lucide-react";
import Image from "next/image";

interface ReviewFormProps {
  productId: string;
  productName?: string;
  orderId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WriteReviewModal({ productId, productName, orderId, isOpen, onClose, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024; // 2MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG and WebP images are allowed.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Each image must be less than 2MB.",
          variant: "destructive",
        });
        return;
      }
    }

    if (images.length + files.length > 3) {
      toast({
        title: "Limit exceeded",
        description: "You can only upload up to 3 images.",
        variant: "destructive",
      });
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setRatingError(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload images to Supabase if any
      const imageUrls = await Promise.all(
        images.map((file) => uploadFile(file, `reviews/${productId}`, { bucket: "giftbox" }))
      );

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          orderId,
          rating,
          comment: comment.trim() || null,
          images: imageUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.message || "Something went wrong. Please try again.");
        return;
      }

      toast({
        title: "Review submitted",
        description: "Your review has been submitted and is pending approval.",
      });

      // Reset state
      setImages([]);
      setPreviews([]);
      setRating(0);
      setComment("");
      onSuccess();
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Review submit error:", error);
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            {productName ? `Share your thoughts about ${productName}` : "Share your thoughts about this product with other customers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rating</Label>
            <StarRating
              rating={rating}
              onRatingChange={(value) => {
                setRating(value);
                setRatingError(false);
              }}
              starClassName="h-8 w-8"
            />
            {ratingError && (
              <p className="text-xs text-red-500 font-medium">Please select a rating</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="What did you like or dislike?"
              className="resize-none h-32"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
            <p className="text-[10px] text-right text-muted-foreground">
              {comment.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Images (Optional, Max 3)</Label>
            <div className="flex flex-wrap gap-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-brand-border">
                  <Image src={preview} alt={`Preview ${index}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.length < 3 && (
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-brand-border rounded-lg cursor-pointer hover:bg-brand-light/10 transition-colors">
                  <Camera className="h-6 w-6 text-brand-primary" />
                  <span className="text-[10px] font-medium text-brand-primary mt-1">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {submitError && (
            <p className="text-red-500 text-sm mt-2">{submitError}</p>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#A7066A] hover:bg-[#8a0558] text-white font-medium px-6 py-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
