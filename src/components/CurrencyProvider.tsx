"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import useSWR from "swr";

const CURRENCY_MAP = {
  LKR: { symbol: "LKR ", locale: "en-LK", decimals: 2 },
  USD: { symbol: "$", locale: "en-US", decimals: 2 },
  OMR: { symbol: "OMR ", locale: "en-OM", decimals: 3 },
} as const;

type CurrencyCode = keyof typeof CURRENCY_MAP;

interface CurrencyContextType {
  currency: string;
  formatPrice: (amount: number | string) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "LKR",
  formatPrice: (amount) => `LKR ${Number(amount).toFixed(2)}`,
  symbol: "LKR ",
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CurrencyProvider({
  children,
  initialCurrency = "LKR",
}: {
  children: React.ReactNode;
  initialCurrency?: string;
}) {
  const [currency, setCurrency] = useState(initialCurrency);

  // Sync with settings using SWR
  const { data } = useSWR("/api/shipping-config", fetcher, {
    refreshInterval: 10000, // Sync every 10s
    revalidateOnFocus: true,
  });

  useEffect(() => {
    if (data?.success && data?.data?.currency) {
      setCurrency(data.data.currency);
      // Sync cookie
      document.cookie = `store_currency=${data.data.currency}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [data]);

  const config = CURRENCY_MAP[currency as CurrencyCode] || CURRENCY_MAP.LKR;

  const formatPrice = (amount: number | string) => {
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return `${config.symbol}0.00`;
    
    // Standard rounding to required currency decimal places
    const factor = Math.pow(10, config.decimals);
    const roundedAmount = Math.round(numericAmount * factor) / factor;
    
    return `${config.symbol}${roundedAmount.toLocaleString(config.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice, symbol: config.symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
