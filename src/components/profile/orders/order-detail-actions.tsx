"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftCardModal } from "@/components/profile/orders/gift-card-modal";
import { toast } from "sonner";

interface OrderDetailActionsProps {
  orderId: string;
  orderNumber: string;
  hasGiftCards: boolean;
  isPaid: boolean;
}

export function OrderDetailActions({ orderId, orderNumber, hasGiftCards, isPaid }: OrderDetailActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [giftCards, setGiftCards] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!hasGiftCards) return null;

  const handleViewVoucher = async () => {
    if (!isPaid) {
      toast.info("Voucher code will be available after payment confirmation.");
      return;
    }

    // Open modal immediately to show loading state
    setIsModalOpen(true);

    if (giftCards && giftCards.length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/profile/orders/${orderId}/gift-cards`);
      if (!response.ok) throw new Error("Failed to fetch vouchers");
      const data = await response.json();
      
      const fetchedVouchers = data.giftCards;
      if (fetchedVouchers && Array.isArray(fetchedVouchers) && fetchedVouchers.length > 0) {
        setGiftCards(fetchedVouchers);
      } else {
        setGiftCards([]); // Show empty state
        toast.info(data.message || "No vouchers available yet.");
      }
    } catch (error) {
      console.error(error);
      setGiftCards([]); // Reset on error
      toast.error("Could not retrieve vouchers.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleViewVoucher}
        disabled={isLoading || !isPaid}
        className={`${!isPaid ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-[#FCEAF4] text-[#A7066A] hover:bg-[#A7066A]/10'} border-none shadow-none font-bold transition-all px-6 py-5 rounded-xl`}
      >
        <Eye className="mr-2 size-5" />
        {isLoading ? "Fetching..." : "View Purchased Gift Card"}
      </Button>

      <GiftCardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        vouchers={giftCards} 
        orderNumber={orderNumber} 
      />
    </>
  );
}
