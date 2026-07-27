"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { usePosCart } from "@/store/use-pos-cart";

interface GiftCardActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GiftCardActivationModal({ isOpen, onClose }: GiftCardActivationModalProps) {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("1000");
  const [isPhysical, setIsPhysical] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      toast.error("Please enter or scan a gift card code.");
      return;
    }

    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error("Please enter a valid positive activation amount.");
      return;
    }

    if (!isPhysical) {
      const trimmedEmail = recipientEmail.trim();
      if (!trimmedEmail) {
        toast.error("Recipient email is required for eGift Cards.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error("Please enter a valid recipient email address.");
        return;
      }
    }

    setIsActivating(true);
    try {
      const res = await fetch("/api/admin/pos/gift-cards/check-issuance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, isPhysical }),
      });
      const data = await res.json();

      if (!res.ok || !data.eligible) {
        toast.error(data.message || "This card is not eligible for issuance.");
        return;
      }

      usePosCart.getState().addItem({
        id: data.cardId || `virtual-gc-${Date.now()}`,
        name: `Gift Card (${trimmedCode.toUpperCase()})`,
        sku: "GIFT-CARD-POS",
        price: numericValue,
        salePrice: null,
        stock: 9999,
        image: null,
        isEGiftCard: !isPhysical,
        giftCardValue: numericValue,
        giftCardCode: trimmedCode.toUpperCase(),
        recipientEmail: !isPhysical ? recipientEmail.trim() : null,
        personalMessage: !isPhysical ? personalMessage.trim() : null,
      });

      toast.success(`Gift card added to cart successfully!`);
      setCode("");
      setValue("1000");
      setRecipientEmail("");
      setPersonalMessage("");
      onClose();
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="bg-amber-100 p-2 rounded-xl">
              <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
            </div>
            Quick Gift Card Activation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Add a new gift card to the current sale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">


          {/* Code/Barcode Input */}
          <div className="space-y-1.5">
            <Label htmlFor="gc-code" className="text-xs font-semibold text-slate-700">
              Gift Card Code or Barcode
            </Label>
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="gc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Scan barcode or enter code"
                className="pl-9 h-11 text-sm font-mono tracking-wider border-slate-200 focus-visible:ring-[#A7066A]"
                disabled={isActivating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleActivate();
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Amount/Value Input */}
          <div className="space-y-1.5">
            <Label htmlFor="gc-value" className="text-xs font-semibold text-slate-700">
              Activation Balance (Rs.)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rs.
              </span>
              <Input
                id="gc-value"
                type="number"
                min="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="1000"
                className="pl-9 h-11 text-sm font-semibold border-slate-200 focus-visible:ring-[#A7066A]"
                disabled={isActivating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleActivate();
                }}
              />
            </div>
          </div>

          {/* Recipient Email & Personal Message Inputs for eGift Cards */}
          {!isPhysical && (
            <>
              <div className="space-y-1.5 animate-fadeIn">
                <Label htmlFor="gc-email" className="text-xs font-semibold text-slate-700">
                  Recipient Email
                </Label>
                <Input
                  id="gc-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="h-11 text-sm border-slate-200 focus-visible:ring-[#A7066A]"
                  disabled={isActivating}
                />
              </div>

              <div className="space-y-1.5 animate-fadeIn">
                <Label htmlFor="gc-message" className="text-xs font-semibold text-slate-700">
                  Personal Message (Optional)
                </Label>
                <Input
                  id="gc-message"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Happy Birthday! Enjoy your gift!"
                  className="h-11 text-sm border-slate-200 focus-visible:ring-[#A7066A]"
                  disabled={isActivating}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isActivating}
            className="h-10 text-xs font-medium border-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            disabled={isActivating}
            className="h-10 bg-[#A7066A] hover:bg-[#8A0558] text-white text-xs font-bold shadow-lg"
          >
            {isActivating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Activating...
              </>
            ) : (
              "Validate & Add to Cart"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
