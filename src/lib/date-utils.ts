import { format, formatDistance, formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";

// Global cache to avoid excessive DB calls
let cachedTimezone: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getAppTimezone(): Promise<string> {
  const now = Date.now();
  if (cachedTimezone && (now - lastFetchTime) < CACHE_TTL) {
    return cachedTimezone;
  }
  
  try {
    const details = await db.companyDetails.findUnique({
      where: { id: "1" },
      select: { timezone: true }
    });
    cachedTimezone = details?.timezone || "Asia/Muscat";
    lastFetchTime = now;
    return cachedTimezone;
  } catch (error) {
  }
}

export function clearTimezoneCache() {
  cachedTimezone = null;
  lastFetchTime = 0;
}

/**
 * Formats a date using the globally configured application timezone.
 * Usage: await formatAppDate(date, "MMM dd, yyyy")
 */
export async function formatAppDate(
  date: Date | string | number,
  formatString: string
): Promise<string> {
  const tz = await getAppTimezone();
  return formatInTimeZone(new Date(date), tz, formatString);
}

/**
 * For client components that already fetched the timezone, or standard formats.
 */
export function formatAppDateSync(
  date: Date | string | number,
  formatString: string,
  tz: string = "Asia/Muscat"
): string {
  return formatInTimeZone(new Date(date), tz, formatString);
}
