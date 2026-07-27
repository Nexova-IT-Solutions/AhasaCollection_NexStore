"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Gift, Sparkles, CreditCard, Calendar, ShieldCheck, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { GiftCardTemplate } from "./gift-card-template";

interface Voucher {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  currency: string;
  expiresAt: string | null;
}

interface GiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[] | null;
  orderNumber: string;
}

export function GiftCardModal({ isOpen, onClose, vouchers, orderNumber }: GiftCardModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    console.log("Modal Render State:", { 
      isOpen, 
      hasData: !!vouchers, 
      count: vouchers?.length || 0,
      isLoading: vouchers === null 
    });
  }, [isOpen, vouchers]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Voucher code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-[2.5rem] border-none shadow-2xl">

        <DialogHeader className="p-8 pb-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
          <div className="flex items-center justify-between pr-10">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#1F1720]">
                <div className="p-2 rounded-xl bg-[#FCEAF4]">
                  <Gift className="w-6 h-6 text-[#A7066A]" />
                </div>
                Your Gift Vouchers
              </DialogTitle>
              <p className="text-sm font-medium text-[#6B5A64] flex items-center gap-2">
                Order <span className="font-mono text-[#A7066A]">{orderNumber}</span> 
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                {vouchers?.length || 0} {(vouchers?.length || 0) === 1 ? 'Voucher' : 'Vouchers'} Total
              </p>
            </div>
            {(vouchers?.length || 0) > 1 && (
              <Badge className="bg-[#A7066A] text-white border-none px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#A7066A]/20">
                Multi-Voucher Order
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto p-8 pt-4 space-y-12 custom-scrollbar">
          <AnimatePresence>
            {vouchers === null ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#A7066A] animate-spin" />
                <p className="text-[#6B5A64] font-bold text-lg animate-pulse">Retrieving your vouchers...</p>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-slate-50">
                  <Gift className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-[#6B5A64] font-bold text-lg">No vouchers found</p>
                <p className="text-sm text-[#6B5A64]/60">This might happen if the order is still processing.</p>
              </div>
            ) : (
              vouchers.map((voucher, index) => (
                <motion.div 
                  key={voucher.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GiftCardTemplate 
                    voucher={voucher}
                    index={index}
                    totalCount={vouchers.length}
                    isCopied={copiedCode === voucher.code}
                    onCopy={copyToClipboard}
                  />
                  
                  {index < vouchers.length - 1 && (
                    <div className="relative py-4 mt-8">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-3">
                          <Sparkles className="h-5 w-5 text-slate-200" />
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-slate-50/80 backdrop-blur-xl border-t border-slate-100 flex flex-wrap items-center justify-center gap-8 text-[#6B5A64] text-[10px] font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-3">
             <CreditCard className="w-5 h-5 text-[#A7066A]/40" />
             <span>Redeem at Checkout</span>
           </div>
           <div className="w-2 h-2 rounded-full bg-[#A7066A]/10"></div>
           <div className="flex items-center gap-3">
             <Calendar className="w-5 h-5 text-[#A7066A]/40" />
             <span>12 Months Validity</span>
           </div>
           <div className="w-2 h-2 rounded-full bg-[#A7066A]/10"></div>
           <div className="flex items-center gap-3">
             <ShieldCheck className="w-5 h-5 text-[#A7066A]/40" />
             <span>Secure Asset</span>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
