"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  item: {
    id: string;
    productName: string;
    quantity: number;
    returnedQuantity: number;
  };
  onSuccess?: (qty: number) => void;
}

export function ReturnItemModal({ isOpen, onClose, orderId, item, onSuccess }: ReturnItemModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const maxQuantity = item.quantity - (item.returnedQuantity || 0);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);

  // Reset form when opened
  if (!isOpen && quantity !== 1) {
    setQuantity(1);
    setReason("");
    setRestock(true);
  }

  const handleSubmit = async () => {
    if (quantity < 1 || quantity > maxQuantity) {
      toast.error(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderItemId: item.id,
          quantity,
          reason,
          restock,
        }),
      });

      if (res.ok) {
        toast.success(`${quantity}x ${item.productName} returned successfully`);
        onSuccess?.(quantity);
        onClose();
        router.refresh(); // Refresh page to show updated quantities
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to process return");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-[#A7066A]" />
            Return Item
          </DialogTitle>
          <DialogDescription>
            Process a return for <span className="font-semibold text-slate-800">{item.productName}</span>. 
            Available to return: {maxQuantity}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right mt-3">
              Reason
            </Label>
            <Textarea
              id="reason"
              placeholder="Why is this item being returned? (Optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3 resize-none"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="restock" className="text-right">
              Restock
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="restock"
                checked={restock}
                onCheckedChange={setRestock}
                className="data-[state=checked]:bg-[#A7066A]"
              />
              <Label htmlFor="restock" className="text-xs text-slate-500 font-normal">
                Increment inventory stock count for this product
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#A7066A] hover:bg-[#8A0558] text-white">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
