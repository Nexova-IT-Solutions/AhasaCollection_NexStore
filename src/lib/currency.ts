import { cookies } from "next/headers";
import { getStoreConfig } from "./store-config";

export const CURRENCY_MAP = {
  LKR: { symbol: "LKR ", locale: "en-LK", decimals: 2 },
  USD: { symbol: "$", locale: "en-US", decimals: 2 },
  OMR: { symbol: "OMR ", locale: "en-OM", decimals: 3 },
} as const;

export type CurrencyCode = keyof typeof CURRENCY_MAP;

export function formatPriceServer(amount: number | string, currency: string = "LKR"): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "LKR 0.00";
  
  const config = CURRENCY_MAP[currency as CurrencyCode] || CURRENCY_MAP.LKR;
  const factor = Math.pow(10, config.decimals);
  const truncatedAmount = Math.trunc(numericAmount * factor) / factor;

  return `${config.symbol}${truncatedAmount.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })}`;
}

export async function getCurrencyServer(): Promise<string> {
  // Read from cookie first (fast path)
  try {
    const cookieStore = await cookies();
    const cookieCurrency = cookieStore.get("store_currency")?.value;
    if (cookieCurrency && cookieCurrency in CURRENCY_MAP) {
      return cookieCurrency;
    }
  } catch {
    // cookies() might fail if not in a dynamic rendering context
  }
  
  // Fallback to database
  try {
    const config = await getStoreConfig();
    return config?.currency || "LKR";
  } catch {
    return "LKR";
  }
}
