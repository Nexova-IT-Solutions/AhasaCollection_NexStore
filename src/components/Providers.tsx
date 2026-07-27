"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { CurrencyProvider } from "./CurrencyProvider";
import { TimezoneProvider } from "./TimezoneProvider";

export function Providers({
  children,
  initialCurrency = "LKR",
  initialToggles = {},
  initialTimezone = "Asia/Muscat",
}: {
  children: React.ReactNode;
  initialCurrency?: string;
  initialToggles?: Record<string, boolean>;
  initialTimezone?: string;
}) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fallback: {
            "/api/admin/feature-toggles": initialToggles,
          },
        }}
      >
        <CurrencyProvider initialCurrency={initialCurrency}>
          <TimezoneProvider initialTimezone={initialTimezone}>
            {children}
          </TimezoneProvider>
        </CurrencyProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
