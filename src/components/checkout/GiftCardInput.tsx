"use client";

import { useState } from "react";
import { useCartStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GiftCardInputProps {
  /** Sum of ALL fees beyond subtotal: deliveryFee + wrappingFee + paymentFee */
  extraFees: number;
}

export function GiftCardInput({ extraFees }: GiftCardInputProps) {
  const { appliedGiftCard, setGiftCard, clearGiftCard } = useCartStore();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a gift card code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gift-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.message || "Failed to validate gift card.");
        return;
      }

      setGiftCard({ 
        code: data.code, 
        cardId: data.cardId, 
        balance: data.balance 
      }, extraFees);

      setCode("");
      
      toast({
        title: "Gift Card Applied",
        description: `Successfully applied gift card (Balance: LKR ${data.balance.toLocaleString()})`,
        duration: 3000,
      });

    } catch (err) {
      console.error("Gift card error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    clearGiftCard();
    setError(null);
  };

  if (appliedGiftCard) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm text-green-800">
              Gift Card Applied
              <Badge variant="outline" className="ml-2 bg-white text-green-700 border-green-200">
                {appliedGiftCard.code}
              </Badge>
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Available Balance: LKR {appliedGiftCard.balance.toLocaleString()}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRemove}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#1F1720]">Have a gift card or voucher?</p>
      <div className="flex gap-2">
        <Input 
          placeholder="Enter code (e.g. GBL-XXXXX)" 
          value={code} 
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          className="uppercase basis-[70%]"
        />
        <Button 
          onClick={handleApply} 
          disabled={!code.trim() || isLoading}
          variant="outline"
          className="basis-[30%]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
}
