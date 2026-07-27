"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store";

export function SuccessClient({ shouldPoll = false }: { shouldPoll?: boolean }) {
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  useEffect(() => {
    // clearCart() sets { items: [] } which Zustand's persist middleware
    // automatically serialises to localStorage. No need to manually
    // call localStorage.removeItem() — doing so desynchs the store.
    clearCart();

    // Force Next.js App Router to invalidate server caches
    router.refresh();

  }, [clearCart, router]);

  useEffect(() => {
    if (!shouldPoll) return;

    // Poll every 5 seconds to show real-time gift card delivery status
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    // Stop polling after 1 minute to save resources
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [shouldPoll, router]);

  return null;
}
