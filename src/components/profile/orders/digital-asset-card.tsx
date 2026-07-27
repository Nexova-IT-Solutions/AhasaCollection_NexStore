"use client";

import { useState } from "react";
import { Copy, Check, Ticket, Eye, ExternalLink, X, Calendar, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/admin-orders";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type DigitalGiftCard = {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  currency: string;
  isActive: boolean;
  expiresAt: string | null;
  deliveryStatus: string;
  createdAt: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  personalMessage?: string | null;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
  } | null;
};

type DigitalAssetCardProps = {
  giftCard: DigitalGiftCard;
  isGiftedView?: boolean;
};

export function DigitalAssetCard({ giftCard, isGiftedView }: DigitalAssetCardProps) {
  const t = useTranslations("ProfileOrders");
  const [copied, setCopied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedCode = `${giftCard.code.substring(0, 4)}-****-${giftCard.code.substring(giftCard.code.length - 4)}`;

  return (
    <>
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader className="p-5 pb-0 border-none space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("card.orderRef")}</p>
                <p className="font-mono text-sm font-bold text-gray-900 tracking-tight">{giftCard.order?.orderNumber || "N/A"}</p>
              </div>
              <p className="text-xs text-gray-500 font-medium">{format(new Date(giftCard.createdAt), "PPP")}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight shadow-none border-none",
                giftCard.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              )}>
                {giftCard.isActive ? t("card.active") : t("card.inactive")}
              </Badge>
              <Badge className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight shadow-none border-none bg-blue-100 text-blue-800">
                {t("card.digitalAsset")}
              </Badge>
              {isGiftedView && (giftCard.recipientName || giftCard.recipientEmail) && (
                <Badge className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight shadow-none border-none bg-[#FCEAF4] text-[#A7066A]">
                  {t("card.sentTo", { name: giftCard.recipientName || giftCard.recipientEmail || "" })}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50/80 p-3 border border-gray-100/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg border border-gray-100">
                <Ticket className="size-3.5 text-[#A7066A]" />
              </div>
              <p className="text-xs font-semibold text-gray-700">{t("card.eGiftCard")}</p>
            </div>
            <div className="hidden sm:block h-3 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("card.balance")}</p>
              <p className="text-xs font-bold text-[#A7066A]">{formatCurrency(giftCard.balance)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 group">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">{t("card.securityMaskedCode")}</p>
              <code className="text-sm font-bold tracking-widest text-gray-900 group-hover:text-[#A7066A] transition-colors">{maskedCode}</code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg hover:bg-[#FCEAF4] hover:text-[#A7066A]"
              onClick={() => handleCopy(giftCard.code)}
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-5 bg-gray-50/30">
          <div className="flex items-baseline gap-2 w-full sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("card.faceValue")}</p>
            <p className="text-xl font-black text-[#A7066A] tabular-nums leading-none">
              {formatCurrency(giftCard.initialValue)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleCopy(giftCard.code)}
              variant="outline"
              className="rounded-xl px-4 h-10 max-md:w-full border-gray-200 text-gray-600 font-bold hover:bg-white hover:text-[#A7066A]"
            >
              <Copy className="mr-1.5 size-4" />
              {t("card.copy")}
            </Button>
            <Button
              onClick={() => setIsDetailsOpen(true)}
              className="bg-[#A7066A] hover:bg-[#8A0558] font-bold rounded-xl shadow-lg shadow-[#A7066A]/10 px-6 max-md:w-full h-10"
            >
              <Eye className="mr-1.5 size-4" />
              {t("card.viewFullDetails")}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={(open) => !open && setIsDetailsOpen(false)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-4 bg-white border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-[#1F1720] flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FCEAF4]">
                <Ticket className="size-5 text-[#A7066A]" />
              </div>
              {t("dialog.voucherDetails")}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#6B5A64]">
              {t("dialog.voucherDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className="relative group">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5 border-2 border-dashed border-slate-200">
                <code className="text-lg font-black tracking-widest text-[#A7066A]">
                  {giftCard.code}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-xl hover:bg-[#A7066A] hover:text-white transition-colors"
                  onClick={() => handleCopy(giftCard.code)}
                >
                  {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl bg-[#FCEAF4]/30 p-6">
              <h4 className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">{t("dialog.howToRedeem")}</h4>
              <ul className="space-y-3 text-sm text-[#6B5A64]">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#A7066A] text-[10px] font-bold text-white">1</div>
                  {t("dialog.step1")}
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#A7066A] text-[10px] font-bold text-white">2</div>
                  {t("dialog.step2")}
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#A7066A] text-[10px] font-bold text-white">3</div>
                  {t("dialog.step3")}
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B5A64] font-medium pt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-slate-400" />
                {giftCard.expiresAt ? t("dialog.validUntil", { date: format(new Date(giftCard.expiresAt), "PPP") }) : t("dialog.noExpiry")}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="size-3.5" />
                {t("dialog.verified")}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
