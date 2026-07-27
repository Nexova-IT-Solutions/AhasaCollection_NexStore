import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Resolves a Supabase Storage path to its full public URL.
 * - Absolute http/https URLs are returned as-is.
 * - blob: URLs (stale browser references) return the placeholder image.
 * - Relative paths like "returns/order_123/file.jpg" are prefixed with
 *   the giftbox bucket base URL to avoid double-prefix bugs.
 */
export function resolveStorageUrl(pathStr: string | null | undefined): string {
  if (!pathStr) return "/placeholder-product.png";

  // Pass through already-absolute URLs
  if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) {
    return pathStr;
  }

  // Catch stale blob: references saved to DB — they're useless outside the uploading browser
  if (pathStr.startsWith("blob:")) {
    console.warn("[resolveStorageUrl] Stale blob: reference found in database — falling back to placeholder.");
    return "/placeholder-product.png";
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kvglredjnqdqqbmmhivi.supabase.co";

  // Strip any leading slash, then strip the bucket prefix if it was accidentally stored
  const cleanPath = pathStr.replace(/^\//, "").replace(/^giftbox\//, "");

  return `${supabaseUrl}/storage/v1/object/public/giftbox/${cleanPath}`;
}
