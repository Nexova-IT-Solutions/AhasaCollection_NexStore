"use client";

import { Gift, Copy, Check, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GiftCardTemplateProps {
  voucher: {
    id: string;
    code: string;
    initialValue: number;
    currency: string;
    expiresAt: string | null;
  };
  index: number;
  totalCount: number;
  isCopied: boolean;
  onCopy: (code: string) => void;
}

export function GiftCardTemplate({ voucher, index, totalCount, isCopied, onCopy }: GiftCardTemplateProps) {
  const getCardGradient = (val: number) => {
    return "from-[#A7066A] via-[#C4077D] to-[#E30B5C]";
  };

  return (
    <div className="space-y-6 group">
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Voucher {index + 1} of {totalCount}
        </span>
        <Badge variant="outline" className="text-[10px] font-bold text-[#A7066A] border-[#A7066A]/20 bg-[#FCEAF4]/30">
          Active Voucher
        </Badge>
      </div>

      {/* Gift Card Visual */}
      <div className="relative aspect-[16/9] w-full max-w-lg mx-auto transform transition-transform duration-500 group-hover:scale-[1.02]">
        <div className={`relative h-full w-full bg-gradient-to-br ${getCardGradient(voucher.initialValue)} rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl overflow-hidden border border-white/20 ring-1 ring-white/10`}>
          
          {/* Glassmorphism Shine */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/20 via-transparent to-transparent rotate-12 pointer-events-none transition-transform duration-1000 group-hover:translate-x-10 group-hover:-translate-y-10"></div>

          {/* Header */}
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-white/60 animate-pulse" />
                <span className="text-white/60 text-[9px] uppercase tracking-[0.3em] font-black">Official Digital Asset</span>
              </div>
              <span className="text-white font-black text-2xl tracking-tighter">SOHAR PETS CENTER</span>
            </div>
            <div className="bg-white/20 backdrop-blur-xl p-3 rounded-2xl ring-1 ring-white/30 shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Value */}
          <div className="flex flex-col items-center justify-center z-10">
            <span className="text-white/70 text-xs font-bold mb-1 uppercase tracking-widest">Card Value</span>
            <div className="flex items-baseline gap-3">
              <span className="text-white/80 text-2xl font-black">{voucher.currency}</span>
              <span className="text-white text-6xl md:text-7xl font-black tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">
                {voucher.initialValue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Code Display inside Card */}
          <div className="flex flex-col items-center z-10">
            <div className="bg-black/30 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-4 group/code shadow-xl ring-1 ring-black/10">
              <span className="text-white font-mono text-lg md:text-2xl font-black tracking-[0.25em] drop-shadow-md">
                {voucher.code}
              </span>
              <div className="w-px h-6 bg-white/20"></div>
              <button 
                onClick={() => onCopy(voucher.code)}
                className="text-white/60 hover:text-white transition-all transform hover:scale-110 active:scale-95 p-1"
              >
                {isCopied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end z-10">
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] font-mono tracking-[0.2em] font-bold">
                VALID UNTIL: {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "PERPETUAL"}
              </span>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20"></div>)}
            </div>
          </div>

          {/* Background Decor */}
          <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-black/20 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Independent Copy Button */}
      <div className="bg-[#FCEAF4]/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-[#A7066A]/10 backdrop-blur-sm transition-colors hover:bg-[#FCEAF4]/50">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-100">
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-black text-[#1F1720] uppercase tracking-wide">Verified Asset</span>
          </div>
          <p className="text-xs text-[#6B5A64] font-medium leading-relaxed max-w-xs">
            This digital gift card is fully activated. You can apply this code at checkout.
          </p>
        </div>
        <Button 
          onClick={() => onCopy(voucher.code)}
          className="w-full md:w-auto h-14 px-8 bg-[#A7066A] text-white hover:bg-[#8B0557] shadow-xl shadow-[#A7066A]/20 transition-all rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          {isCopied ? (
            <><Check className="w-5 h-5" /> Copied</>
          ) : (
            <><Copy className="w-5 h-5" /> Copy Code</>
          )}
        </Button>
      </div>
    </div>
  );
}
