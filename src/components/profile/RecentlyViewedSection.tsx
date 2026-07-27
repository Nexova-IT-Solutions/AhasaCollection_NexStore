"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProductCard } from "@/components/giftbox";
import type { Product } from "@/types";

type RecentlyViewedItem = {
  id: string;
  name: string;
  price: number;
  image: string;
};

function toProduct(item: RecentlyViewedItem): Product {
  return {
    id: item.id,
    slug: item.id,
    name: item.name,
    description: "",
    shortDescription: "Recently viewed item",
    price: item.price,
    images: [item.image],
    categoryId: "recently-viewed",
    occasionIds: [],
    tags: [],
    inStock: true,
  };
}

export function RecentlyViewedSection() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/profile/recently-viewed", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          setItems([]);
          return;
        }

        const payload = await response.json();
        const list = Array.isArray(payload) ? payload : [];

        const normalized = list
          .filter((item: any) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            image: typeof item.image === "string" && item.image ? item.image : "/logo/logo.png",
          }))
          .slice(0, 10);

        if (normalized.length > 0) {
          setItems(normalized);
          return;
        }

        if (typeof window !== "undefined" && status === "authenticated" && session?.user?.id) {
          const userScopedKey = `recentlyViewed:${session.user.id}`;
          const legacyKey = "recentlyViewed";

          const scopedRaw = window.localStorage.getItem(userScopedKey);
          const legacyRaw = window.localStorage.getItem(legacyKey);
          const raw = scopedRaw || legacyRaw;
          const parsed = raw ? JSON.parse(raw) : [];
          const fallbackList = Array.isArray(parsed) ? parsed : [];

          const fallbackNormalized = fallbackList
            .filter((item: any) => item && typeof item.id === "string" && typeof item.name === "string")
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price) || 0,
              image: typeof item.image === "string" && item.image ? item.image : "/logo/logo.png",
            }))
            .slice(0, 10);

          if (fallbackNormalized.length > 0 && !scopedRaw && legacyRaw) {
            window.localStorage.setItem(userScopedKey, JSON.stringify(fallbackNormalized));
          }

          setItems(fallbackNormalized);
          return;
        }

        setItems([]);
      } catch {
        setItems([]);
      } finally {
        setReady(true);
      }
    };

    void load();
  }, [session?.user?.id, status]);

  if (!ready) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Recently Viewed</h2>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-6">
          No recently viewed items.
        </div>
      ) : (
        <div className="max-h-[620px] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.map((item) => (
              <ProductCard key={item.id} product={toProduct(item)} showAddToCart={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
