"use client";

import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Wallet, CheckCircle2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentGateway {
  name: string;
  feeType: "NONE" | "FIXED" | "PERCENTAGE";
  feeValue: number;
  isActive: boolean;
  mode: "SANDBOX" | "LIVE";
}

interface PaymentOptionsRendererProps {
  gateways: PaymentGateway[];
  selectedPayment: string;
  onSelect: (value: string) => void;
  formatPrice: (price: number) => string;
}

export const PaymentOptionsRenderer: React.FC<PaymentOptionsRendererProps> = ({
  gateways,
  selectedPayment,
  onSelect,
  formatPrice,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case "DIRECTPAY":
        return <CreditCard className="w-6 h-6" />;
      case "MINTPAY":
        return <Wallet className="w-6 h-6" />;
      case "COD":
        return <Banknote className="w-6 h-6" />;
      case "BANK_TRANSFER":
        return <Landmark className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getLabel = (name: string) => {
    switch (name) {
      case "DIRECTPAY":
        return "Card Payment";
      case "MINTPAY":
        return "Mintpay (Installments)";
      case "COD":
        return "Cash on Delivery";
      case "BANK_TRANSFER":
        return "Bank Transfer";
      default:
        return name;
    }
  };

  const getDescription = (name: string) => {
    switch (name) {
      case "DIRECTPAY":
        return "Visa, Mastercard, AMEX";
      case "MINTPAY":
        return "Split into 3 installments";
      case "COD":
        return "Pay when you receive it";
      case "BANK_TRANSFER":
        return "Direct bank deposit";
      default:
        return "Secure payment gateway";
    }
  };

  return (
    <RadioGroup
      value={selectedPayment}
      onValueChange={onSelect}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {gateways.map((gateway) => {
        const isSelected = selectedPayment === gateway.name;
        
        return (
          <div key={gateway.name}>
            <RadioGroupItem
              value={gateway.name}
              id={gateway.name}
              className="sr-only"
            />
            <Label
              htmlFor={gateway.name}
              className={cn(
                "relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group",
                isSelected
                  ? "border-[#A7066A] bg-[#FCEAF4]/30 shadow-sm"
                  : "border-slate-100 bg-white hover:border-[#A7066A]/30 hover:shadow-md"
              )}
            >
              {/* Logo / Icon Area */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isSelected 
                  ? "bg-[#A7066A] text-white" 
                  : "bg-slate-50 text-slate-400 group-hover:bg-[#FCEAF4] group-hover:text-[#A7066A]"
              )}>
                {getIcon(gateway.name)}
              </div>

              {/* Content Area */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    "font-bold text-sm transition-colors",
                    isSelected ? "text-[#1F1720]" : "text-slate-700"
                  )}>
                    {getLabel(gateway.name)}
                  </span>
                  
                  {gateway.feeType !== "NONE" && (
                    <Badge 
                      variant="secondary" 
                      className="bg-orange-50 text-orange-600 text-[10px] font-bold px-1.5 py-0 border-orange-100"
                    >
                      {gateway.feeType === "PERCENTAGE" 
                        ? `+${gateway.feeValue}% fee` 
                        : `+${formatPrice(gateway.feeValue)} fee`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-tight">
                  {getDescription(gateway.name)}
                </p>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 text-[#A7066A]">
                  <CheckCircle2 className="w-5 h-5 fill-[#A7066A] text-white" />
                </div>
              )}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
};
