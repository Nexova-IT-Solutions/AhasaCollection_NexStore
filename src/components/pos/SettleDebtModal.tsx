"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    outstandingBalance?: number;
  };
  onSettled: (newBalance: number) => void;
}

export function SettleDebtModal({ isOpen, onClose, customer, onSettled }: SettleDebtModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number>(customer.outstandingBalance || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>("POS_CASH");
  const [note, setNote] = useState("");

  const maxAmount = customer.outstandingBalance || 0;

  if (!isOpen && amount !== maxAmount) {
    setAmount(maxAmount);
    setPaymentMethod("POS_CASH");
    setNote("");
  }

  const handleSubmit = async () => {
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`Amount must be between 0.001 and ${maxAmount.toFixed(3)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod, note }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully settled OMR ${amount.toFixed(3)}`);
        onSettled(maxAmount - amount);
        onClose();
      } else {
        toast.error(data.message || "Failed to settle debt");
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
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <DollarSign className="h-5 w-5" />
            Settle Debt for {customer.name}
          </DialogTitle>
          <DialogDescription>
            Outstanding Balance: <strong>OMR {maxAmount.toFixed(3)}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              max={maxAmount}
              step={0.01}
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentMethod" className="text-right">
              Method
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POS_CASH">Cash</SelectItem>
                <SelectItem value="POS_CARD">Card Terminal</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="note" className="text-right mt-3">
              Note
            </Label>
            <Textarea
              id="note"
              placeholder="Optional reference note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="col-span-3 resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
