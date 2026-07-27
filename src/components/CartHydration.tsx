"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { SpecialTouchProduct } from "@/lib/special-touch";
import { useCartStore, useBoxBuilderStore } from "@/store";

type CartHydrationProps = {
  specialTouchProducts: SpecialTouchProduct[];
};

/**
 * Handles Zustand store hydration and cart merging for authenticated users.
 * This component is placed in the root layout to ensure global availability.
 */
export default function CartHydration({ specialTouchProducts }: CartHydrationProps) {
  const setSpecialTouchProducts = useCartStore((state) => state.setSpecialTouchProducts);
  const setItems = useCartStore((state) => state.setItems);
  const clearCart = useCartStore((state) => state.clearCart);
  const isHydrated = useCartStore((state) => state.isHydrated);
  const { status } = useSession();

  // Use a ref to track whether we've already merged this session.
  // This prevents the effect from re-running every time `items` changes
  // after setItems() is called, which would cause an infinite loop.
  const hasMergedRef = useRef(false);

  useLayoutEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (!useCartStore.persist.hasHydrated()) {
        void useCartStore.persist.rehydrate();
      }

      if (!useBoxBuilderStore.persist.hasHydrated()) {
        void useBoxBuilderStore.persist.rehydrate();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync special touch products from server to store
  useEffect(() => {
    setSpecialTouchProducts(specialTouchProducts);
  }, [setSpecialTouchProducts, specialTouchProducts]);

  // Handle cart merging when a user logs in.
  // IMPORTANT: `items` is intentionally NOT in the dependency array to prevent
  // an infinite loop where setItems() triggers another merge.
  useEffect(() => {
    if (!isHydrated || !useCartStore.persist.hasHydrated()) return;

    if (status === "authenticated" && !hasMergedRef.current) {
      hasMergedRef.current = true;

      const mergeCart = async () => {
        try {
          // Read the current local items at call-time (not from closure)
          // to get a stable snapshot.
          const localItems = useCartStore.getState().items;

          const res = await fetch("/api/cart/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Send local items so the server can merge guest additions
            body: JSON.stringify({ items: localItems }),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items)) {
              // DB cart is the source of truth. Replace local state entirely.
              setItems(data.items);
            }
          } else {
            console.error("[CartHydration] Merge failed:", res.status, res.statusText);
          }
        } catch (error) {
          console.error("[CartHydration] Failed to merge cart:", error);
        }
      };

      mergeCart();
    }

    // On logout: clear the local cart so stale items don't persist
    // for the next user who logs in on the same browser.
    if (status === "unauthenticated") {
      if (hasMergedRef.current) {
        // User just logged out — clear local state
        clearCart();
      }
      hasMergedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isHydrated, setItems, clearCart]);

  return null;
}
