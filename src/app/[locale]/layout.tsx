import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';
import { getCachedSpecialTouch } from "@/lib/cache";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: "SPC - Premium Pet Supplies & Care in Sohar",
  description: "Discover premium pet products and services at SPC. High-quality pet food, accessories, toys, and care items for your beloved pets in Sohar.",
  keywords: ["pet supplies Sohar", "pet shop Sohar", "dog food", "cat food", "pet accessories", "SPC"],
  authors: [{ name: "SPC" }],
  icons: {
    icon: "/logo/logo.png",
  },
  openGraph: {
    title: "SPC - Premium Pet Supplies & Care",
    description: "Premium pet products and services for every pet in Sohar",
    type: "website",
    locale: "en_LK",
  },
};

import dynamic from "next/dynamic";
import { Providers } from "@/components/Providers";
import CartHydration from "@/components/CartHydration";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import TopLoaderProvider from "@/components/TopLoaderProvider";

import { getCurrencyServer } from "@/lib/currency";
import { getInitialFeatureToggles } from "@/lib/queries/feature-toggles";
import { getAppTimezone } from "@/lib/date-utils";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const specialTouchProducts = await getCachedSpecialTouch();
  const initialCurrency = await getCurrencyServer();
  const initialToggles = await getInitialFeatureToggles();
  const initialTimezone = await getAppTimezone();
  return (
    <html lang={locale} className="h-full overflow-x-hidden" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col w-full max-w-full overflow-x-hidden`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <NuqsAdapter>
            <Providers initialCurrency={initialCurrency} initialToggles={initialToggles} initialTimezone={initialTimezone}>
              <TopLoaderProvider />
              <CartHydration specialTouchProducts={specialTouchProducts} />
              <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
                {children}
              </div>
              <WhatsAppFAB />
              <Toaster />
            </Providers>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
