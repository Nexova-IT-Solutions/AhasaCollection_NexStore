"use client";

import * as React from "react";
import { 
  UserRound, 
  Mail, 
  Phone as PhoneIcon, 
  MapPin, 
  Clock3, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CustomerInsightsPanelProps = {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  userId: string | null;
  formattedAddress: string;
  customerOrderCount: number;
  customerSince: string;
  locale: string;
};

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Text successfully copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="bg-transparent hover:bg-slate-100 p-1.5 rounded-md text-slate-400 hover:text-[#A7066A] transition-colors focus:outline-none shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3.5 text-green-600 animate-in fade-in zoom-in-75 duration-200" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function ShippingAddressSection({ formattedAddress }: { formattedAddress: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const isLongAddress = formattedAddress.length > 80;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B5A64]">Delivery Destination</p>
        <CopyButton text={formattedAddress} />
      </div>
      <div className="relative flex gap-3 rounded-xl border border-brand-border bg-[#FFF7FB]/30 p-3 transition-all duration-300">
        <MapPin className="size-4 shrink-0 text-[#A7066A] mt-0.5" />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[#6B5A64]">Shipping Address</span>
          <div
            className={cn(
              "mt-1 text-sm font-bold text-[#1F1720] leading-relaxed break-words transition-all duration-300",
              !expanded && isLongAddress && "max-h-[3.6rem] overflow-hidden line-clamp-2"
            )}
          >
            {formattedAddress}
          </div>
          {isLongAddress && (
            <button
              onClick={() => setExpanded(!expanded)}
              type="button"
              className="mt-1 text-xs font-semibold text-[#A7066A] hover:underline focus:outline-none"
            >
              {expanded ? "Show Less" : "Show More"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomerInsightsPanel({
  customerName,
  customerEmail,
  customerPhone,
  userId,
  formattedAddress,
  customerOrderCount,
  customerSince,
  locale
}: CustomerInsightsPanelProps) {
  const [showEngagement, setShowEngagement] = React.useState(true);

  return (
    <Card className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden p-5 md:p-6">
      <CardHeader className="bg-transparent p-0 mb-1.5">
        <CardTitle className="text-base font-bold text-[#1F1720]">Customer Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-0 pt-0 text-sm">
        {/* Customer Identity Block */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B5A64]">Customer Contact</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-slate-50 p-2">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <UserRound className="size-4 shrink-0 text-[#A7066A]" />
                <span className="text-xs text-[#6B5A64] shrink-0">Name:</span>
                <span className="font-bold text-[#1F1720] whitespace-normal break-words w-full">{customerName}</span>
              </div>
              <CopyButton text={customerName} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-slate-50 p-2">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <Mail className="size-4 shrink-0 text-[#A7066A]" />
                <span className="text-xs text-[#6B5A64] shrink-0">Email:</span>
                <span className="font-bold text-[#1F1720] break-all whitespace-normal w-full" title={customerEmail || ""}>{customerEmail || "No Email"}</span>
              </div>
              <CopyButton text={customerEmail || ""} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-slate-50 p-2">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <PhoneIcon className="size-4 shrink-0 text-[#A7066A]" />
                <span className="text-xs text-[#6B5A64] shrink-0">Phone:</span>
                <span className="font-bold text-[#1F1720] whitespace-normal break-words w-full">{customerPhone || "No Phone"}</span>
              </div>
              <CopyButton text={customerPhone || ""} />
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Address Section */}
        <ShippingAddressSection formattedAddress={formattedAddress} />

        {/* CRM / Retention Data Block */}
        <div className="border-t border-slate-100 pt-2 space-y-2">
          <button
            onClick={() => setShowEngagement(!showEngagement)}
            type="button"
            className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B5A64] hover:text-[#A7066A] transition-colors focus:outline-none"
          >
            <span>CRM & Engagement</span>
            {showEngagement ? (
              <ChevronUp className="size-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="size-3.5 text-slate-400" />
            )}
          </button>

          {showEngagement && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-brand-border bg-[#FFF7FB]/20 p-2">
                  <span className="block text-[10px] text-[#6B5A64] font-medium uppercase tracking-wider">Loyalty Status</span>
                  <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {customerOrderCount > 1 ? "Repeat Customer" : "New Customer"}
                  </span>
                </div>
                <div className="rounded-xl border border-brand-border bg-[#FFF7FB]/20 p-2">
                  <span className="block text-[10px] text-[#6B5A64] font-medium uppercase tracking-wider">Frequency</span>
                  <span className="mt-1 block text-xs font-bold text-[#1F1720]">
                    {customerOrderCount || 0} {customerOrderCount === 1 ? "order" : "orders"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-brand-border bg-[#FFF7FB]/25 p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-3.5 text-[#A7066A]" />
                  <span className="text-xs text-[#6B5A64]">Customer Since</span>
                </div>
                <span className="text-xs font-bold text-[#1F1720]">{customerSince}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation to customer profile removed per admin UI preference */}
      </CardContent>
    </Card>
  );
}
