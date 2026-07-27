"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Gift, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("Hero");
  return (
    <section className="relative min-h-[65vh] lg:min-h-[70vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FFF7FB] via-white to-[#FCEAF4]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[#A7066A]/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-[#E91E8C]/10 blur-3xl" />
        <div className="absolute top-40 right-1/4 w-24 h-24 rounded-full bg-[#FF6B9D]/10 blur-2xl" />
      </div>

      <div className="relative w-full max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 2xl:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 2xl:gap-20 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A7066A]/10 text-[#A7066A] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {t("premiumGiftStore")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-bold text-[#1F1720] leading-tight">
              {t("title1")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A7066A] to-[#E91E8C]">
                {t("title2")}
              </span>
            </h1>

            <p className="mt-6 text-lg text-[#6B5A64] max-w-xl 2xl:max-w-2xl mx-auto lg:mx-0">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#A7066A] to-[#E91E8C] hover:opacity-90 text-white rounded-full px-8"
              >
                <Link href="/box-builder" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t("buildYourBox")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#A7066A] text-[#A7066A] hover:bg-[#A7066A] hover:text-white rounded-full px-8"
              >
                <Link href="/categories" className="gap-2">
                  {t("shopGifts")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#A7066A]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#1F1720]">{t("giftOptionsVal")}</p>
                  <p className="text-xs text-[#6B5A64]">{t("giftOptionsLbl")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#A7066A]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#1F1720]">{t("happyCustomersVal")}</p>
                  <p className="text-xs text-[#6B5A64]">{t("happyCustomersLbl")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#A7066A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#1F1720]">{t("deliveryVal")}</p>
                  <p className="text-xs text-[#6B5A64]">{t("deliveryLbl")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-[4/3]">
              {/* Main Image */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 max-h-[350px] md:max-h-[400px] lg:max-h-[450px] xl:max-h-[500px]">
                <Image
                  src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&h=600&fit=crop"
                  alt="Gift Box"
                  fill
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Secondary Images */}
              <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-2xl overflow-hidden shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <Image
                  src="/images/image-01.jpeg"
                  alt="Chocolates"
                  fill
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-4 -right-4 w-40 h-40 rounded-2xl overflow-hidden shadow-xl transform rotate-6 hover:rotate-0 transition-transform duration-300">
                <Image
                  src="/images/image-02.jpeg"
                  alt="Flowers"
                  fill
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute bottom-12 right-12 bg-white rounded-full px-6 py-3 shadow-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A7066A]" />
                <span className="font-semibold text-[#1F1720]">{t("customBoxes")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
