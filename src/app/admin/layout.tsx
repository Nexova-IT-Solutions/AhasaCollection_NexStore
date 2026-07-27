import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { MainHeader } from "@/components/admin/main-header";
import { authOptions } from "@/lib/auth";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { Providers } from "@/components/Providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import TopLoaderProvider from "@/components/TopLoaderProvider";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Dashboard - SPC",
  description: "SPC Admin Panel",
  icons: {
    icon: "/logo/logo.png",
  },
};

import { getCurrencyServer } from "@/lib/currency";
import { getInitialFeatureToggles } from "@/lib/queries/feature-toggles";
import { getAppTimezone } from "@/lib/date-utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  if (!session || session?.user?.role === "USER") {
    redirect("/");
  }

  const messages = await getMessages({ locale: 'en' });
  const initialCurrency = await getCurrencyServer();
  const initialToggles = await getInitialFeatureToggles();
  const initialTimezone = await getAppTimezone();

  return (
    <html lang="en" className="h-full overflow-hidden" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground h-full w-full overflow-hidden`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale="en">
          <NuqsAdapter>
            <Providers initialCurrency={initialCurrency} initialToggles={initialToggles} initialTimezone={initialTimezone}>
              <TopLoaderProvider />
              <SidebarProvider>
                <AdminLayoutShell sidebar={<AppSidebar />}>
                  <MainHeader user={session?.user ?? null} />
                  <main className="flex-1 overflow-y-auto">
                    {children}
                  </main>
                </AdminLayoutShell>
              </SidebarProvider>
              <Toaster />
            </Providers>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
