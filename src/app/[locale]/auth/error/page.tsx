"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, 
  ArrowLeft, 
  Mail, 
  MessageCircle, 
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const t = useTranslations("Auth");

  // Determine if it's a suspension error
  const isSuspended = error === "Suspended" || error === "ACCOUNT_SUSPENDED" || error === "AccessDenied";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-pink-100/50 border border-brand-border p-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-8 ring-8 ring-red-50/50">
          <ShieldAlert className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-black text-[#1F1720] mb-4 tracking-tight">
          {isSuspended ? t("suspended") : t("error")}
        </h1>

        <div className="space-y-4 mb-10">
          <p className="text-[#6B5A64] font-medium leading-relaxed">
            {isSuspended 
              ? t("suspendedDescription") 
              : t("genericError")}
          </p>
          
          {isSuspended && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3 text-left">
              <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-800 font-bold text-sm">{t("status")}: {t("suspendedStatus")}</p>
                <p className="text-orange-700/80 text-xs mt-0.5">{t("appealSupport")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button asChild className="bg-[#A7066A] hover:bg-[#8A0558] text-white h-12 rounded-full font-bold shadow-lg shadow-[#A7066A]/20">
            <Link href="/contact" className="flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t("contactSupport")}
            </Link>
          </Button>
          
          <Button variant="ghost" asChild className="h-12 rounded-full font-bold text-[#6B5A64] hover:bg-gray-50">
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              {t("backHome")}
            </Link>
          </Button>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            {t("errorCode")}: <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{error || "Unknown"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
