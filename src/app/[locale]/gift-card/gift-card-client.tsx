"use client";

import { useState } from "react";
import { CreditCard, ShoppingCart, Sparkles, Plus, Minus, Gift, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface GiftCardClientProps {
  denominations: number[];
}

export function GiftCardClient({ denominations }: GiftCardClientProps) {
  const t = useTranslations("GiftCard");
  const { addVirtualGiftCard } = useCartStore();
  const [selectedValue, setSelectedValue] = useState<number>(denominations[0] || 0);
  const [quantity, setQuantity] = useState<number>(1);

  const handlePurchase = () => {
    if (selectedValue <= 0) return;
    addVirtualGiftCard(selectedValue, quantity);
  };

  const handlePredefinedSelect = (val: number) => {
    setSelectedValue(val);
  };

  const displayValue = selectedValue;

  const getCardGradient = (val: number) => {
    switch (val) {
      // case 2000: return "from-[#6366f1] via-[#8b5cf6] to-[#d946ef]";
      // case 3000: return "from-[#0ea5e9] via-[#2563eb] to-[#4f46e5]";
      // case 5000: return "from-[#f59e0b] via-[#d97706] to-[#b45309]";
      // case 10000: return "from-[#111827] via-[#1f2937] to-[#374151]";
      default: return "from-[#A7066A] via-[#C4077D] to-[#E30B5C]";
    }
  };

  const getGlowGradient = (val: number) => {
    switch (val) {
      // case 2000: return "from-[#6366f1]/20 to-[#d946ef]/20";
      // case 3000: return "from-[#0ea5e9]/20 to-[#4f46e5]/20";
      // case 5000: return "from-[#f59e0b]/20 to-[#b45309]/20";
      // case 10000: return "from-[#111827]/20 to-[#374151]/20";
      default: return "from-[#A7066A]/20 to-[#E30B5C]/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* PREMIUM CARD PREVIEW (Left Column) */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full aspect-[16/10] max-w-md perspective-1000 group"
          >
            {/* Soft Glow Background */}
            <div className={`absolute -inset-4 bg-gradient-to-br ${getGlowGradient(displayValue)} rounded-[40px] blur-3xl opacity-50 group-hover:opacity-80 transition-all duration-500`}></div>

            {/* The Main Card */}
            <div className={`relative h-full w-full bg-gradient-to-br ${getCardGradient(displayValue)} rounded-3xl p-8 flex flex-col justify-between shadow-2xl overflow-hidden border border-white/20 ring-1 ring-white/10 transition-all duration-500`}>

              {/* Glassmorphism Shine Effect */}
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12 pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex justify-between items-start z-10">
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-bold">{t("officialGiftCard")}</span>
                  <span className="text-white font-black text-xl tracking-tight">SOHAR PETS CENTER</span>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                  <Gift className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Card Center: Value Display */}
              <div className="flex flex-col items-center justify-center z-10 py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayValue}
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-white/70 text-xs font-medium mb-1">{t("value")}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white/80 text-xl font-bold">LKR</span>
                      <span className="text-white text-5xl md:text-6xl font-black tracking-tighter drop-shadow-2xl">
                        {displayValue.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-end z-10">
                <div className="flex flex-col">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-8 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="w-1/2 h-full bg-white/40"></div>
                      </div>
                    ))}
                  </div>
                  <span className="text-white/50 text-[9px] font-mono tracking-widest">{t("validForMonths")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white/60" />
                  </div>
                </div>
              </div>

              {/* Background Patterns */}
              <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
            </div>
          </motion.div>

          <div className="flex items-center gap-4 text-[#6B5A64] text-sm">
            <Badge variant="secondary" className="bg-[#FCEAF4] text-[#A7066A] border-none px-3 py-1">
              <Check className="w-3 h-3 mr-1" /> {t("instantDelivery")}
            </Badge>
            <Badge variant="secondary" className="bg-[#FCEAF4] text-[#A7066A] border-none px-3 py-1">
              <Check className="w-3 h-3 mr-1" /> {t("useAnywhere")}
            </Badge>
          </div>
        </div>

        {/* REFINED CONTROLS (Right Column) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col space-y-10"
        >
          <div>
            <h1 className="text-4xl font-black text-[#1F1720] tracking-tight mb-3">{t("digitalGiftCard")}</h1>
            <p className="text-[#6B5A64] text-lg leading-relaxed">
              {t("perfectGiftDesc")}
            </p>
          </div>

          <div className="space-y-8">
            {/* Section: Select Value */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {denominations.length > 0 ? (
                  denominations.map((val) => (
                    <button
                      key={val}
                      onClick={() => handlePredefinedSelect(val)}
                      className={`relative px-4 py-4 rounded-2xl border-2 transition-all duration-300 font-bold text-sm whitespace-nowrap ${selectedValue === val
                        ? "border-[#A7066A] bg-[#A7066A] text-white shadow-xl shadow-[#A7066A]/20 scale-[1.02]"
                        : "border-slate-100 text-[#6B5A64] hover:border-[#A7066A]/30 hover:bg-slate-50"
                        }`}
                    >
                      LKR {val}
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-4 text-[#6B5A64] text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    {t("noDenominations")}
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-slate-100 w-full"></div>

            {/* Section: Quantity & CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col space-y-3 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-[0.2em] ml-1">{t("quantity")}</label>
                <div className="flex items-center bg-slate-50 rounded-2xl p-1 border border-slate-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-12 w-12 rounded-xl hover:bg-white hover:text-[#A7066A] transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <span className="w-12 text-center font-black text-xl text-[#1F1720]">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-12 w-12 rounded-xl hover:bg-white hover:text-[#A7066A] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 w-full pt-6 sm:pt-0">
                <Button
                  onClick={handlePurchase}
                  className="w-full h-20 bg-gradient-to-r from-[#A7066A] to-[#E30B5C] hover:from-[#8A0558] hover:to-[#C4077D] text-white rounded-2xl shadow-2xl shadow-[#A7066A]/30 text-xl font-black transition-all hover:-translate-y-1 hover:shadow-[#A7066A]/40 flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    <span>{t("addToCart")}</span>
                  </div>
                  <span className="text-white/80 text-sm font-medium">
                    LKR {(displayValue * quantity).toLocaleString()}
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-[#6B5A64] text-[10px] font-bold uppercase tracking-widest pt-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-300" />
                <span>{t("secureCheckout")}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
              <span>{t("emailsWithinMinutes")}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
