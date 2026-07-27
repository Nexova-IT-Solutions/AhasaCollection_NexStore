"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import { useTransition } from "react";

const languageNames: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்"
};

const languageLabels: Record<Locale, string> = {
  en: "EN",
  si: "සි",
  ta: "த"
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onLanguageChange(newLocale: Locale) {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  }

  return (
    <Select value={locale} onValueChange={(val) => onLanguageChange(val as Locale)} disabled={isPending}>
      <SelectTrigger 
        size="sm" 
        className="flex items-center shrink-0 gap-1.5 sm:gap-2 hover:bg-[#FCEAF4] text-[#6B5A64] h-9 px-2 sm:px-3 border border-brand-border/60 bg-transparent rounded-lg focus:ring-0 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 text-[#A7066A] animate-spin" />
        ) : (
          <Globe className="w-4 h-4 text-[#6B5A64]" />
        )}
        <span className="hidden md:inline font-medium">
          {isPending ? "Loading..." : languageNames[locale]}
        </span>
        <span className="inline md:hidden font-medium">
          {isPending ? "..." : languageLabels[locale]}
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="border-brand-border bg-white min-w-[8rem] z-50">
        {locales.map((loc) => (
          <SelectItem 
            key={loc} 
            value={loc}
            className={`cursor-pointer hover:bg-[#FCEAF4] px-4 py-2.5 text-[#1F1720] focus:bg-[#FCEAF4] focus:text-[#A7066A] ${locale === loc ? "font-semibold text-[#A7066A]" : ""}`}
          >
            {languageNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
