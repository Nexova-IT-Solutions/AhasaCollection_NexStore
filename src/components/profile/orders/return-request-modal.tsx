"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { Loader2, Camera, X, RefreshCcw } from "lucide-react";
import Image from "next/image";

const returnRequestSchema = z.object({
  reason: z.string().min(10, {
    message: "Reason must be at least 10 characters.",
  }),
});

interface ReturnRequestModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReturnRequestModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: ReturnRequestModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const form = useForm<z.infer<typeof returnRequestSchema>>({
    resolver: zodResolver(returnRequestSchema),
    defaultValues: {
      reason: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024; // 2MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPG, PNG and WebP images are allowed.");
        return;
      }
      if (file.size > maxSize) {
        toast.error("Each image must be less than 2MB.");
        return;
      }
    }

    if (images.length + files.length > 3) {
      toast.error("You can only upload up to 3 images.");
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

  const onSubmit = async (values: z.infer<typeof returnRequestSchema>) => {
    setIsSubmitting(true);

    if (!supabase) {
      toast.error("Failed to submit request. Supabase is not initialized.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload every selected file and collect their storage paths.
      // We strictly block until Supabase confirms the upload and returns
      // the real path string (e.g. "returns/order_123/abc.jpg").
      const uploadedImagePaths = await Promise.all(
        images.map(async (file) => {
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;
          const filePath = `returns/${orderId}/${fileName}`;

          const { data: uploadData, error } = await supabase.storage
            .from("giftbox")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
          }

          // uploadData.path is the confirmed relative path, never a blob: URL
          return uploadData.path;
        })
      );

      const response = await fetch(`/api/customer/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: values.reason.trim(),
          images: uploadedImagePaths, // Array of storage path strings saved to DB
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to submit return request.");
      }

      toast.success("Return request submitted successfully.");

      // Reset state
      setImages([]);
      setPreviews([]);
      form.reset();

      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Return submit error:", error);
      toast.error(error.message || "Failed to submit return request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#A7066A] text-xl font-bold">
            <RefreshCcw className="h-6 w-6" />
            Request Return
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Order #{orderNumber}. Please provide details for your return request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">Reason for Return</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you want to return this order..."
                      className="resize-none h-32 rounded-2xl border-gray-200 focus-visible:ring-[#A7066A] focus-visible:border-transparent transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-rose-500" />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-sm font-semibold text-gray-700">Images (Optional, Max 3)</FormLabel>
              <div className="flex flex-wrap gap-3">
                {previews.map((preview, index) => (
                  <div key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-transform hover:scale-105">
                    <Image src={preview} alt={`Preview ${index}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1.5 right-1.5 bg-white/90 text-gray-900 rounded-full p-1 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {previews.length < 3 && (
                  <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer hover:bg-[#FCEAF4]/20 hover:border-[#A7066A]/30 transition-all group">
                    <Camera className="h-7 w-7 text-gray-400 group-hover:text-[#A7066A] transition-colors" />
                    <span className="text-[11px] font-semibold text-gray-400 group-hover:text-[#A7066A] mt-1.5">Add Photo</span>
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

            <DialogFooter className="pt-4 flex gap-3 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl font-semibold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] bg-[#A7066A] hover:bg-[#8a0558] text-white font-bold rounded-2xl shadow-lg shadow-[#A7066A]/20 transition-all active:scale-95 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
