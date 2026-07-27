"use client";

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resendGiftCardEmailsAction } from "./actions";

interface ResendGiftCardButtonProps {
  orderId: string;
}

export function ResendGiftCardButton({ orderId }: ResendGiftCardButtonProps) {
  const [isResending, setIsResending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await resendGiftCardEmailsAction(orderId);
      if (result.success) {
        setIsSent(true);
        toast.success("Gift card emails have been queued for resending.");
        setTimeout(() => setIsSent(false), 5000);
      } else {
        toast.error(result.message || "Failed to resend gift card emails.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={isResending || isSent}
      className={`mt-4 h-10 px-6 rounded-full transition-all ${
        isSent 
          ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-50" 
          : "border-[#A7066A] text-[#A7066A] hover:bg-[#A7066A]/5"
      }`}
    >
      {isResending ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Resending...
        </>
      ) : isSent ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Sent Successfully
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Resend Gift Card Email
        </>
      )}
    </Button>
  );
}
