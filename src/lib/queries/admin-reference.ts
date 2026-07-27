import { unstable_cache } from "next/cache";
import { db, getMoodClient } from "@/lib/db";

export const getCategoriesForAdmin = unstable_cache(
  async () => {
    return db.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-categories"],
  { revalidate: 300, tags: ["categories"] }
);

export const getOccasionsForAdmin = unstable_cache(
  async () => {
    return db.occasion.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-occasions"],
  { revalidate: 300, tags: ["occasions"] }
);

export const getMoodsForAdmin = unstable_cache(
  async () => {
    const moodClient = getMoodClient();
    if (!moodClient) {
      return [] as Array<{ id: string; name: string; icon: string | null }>;
    }

    return moodClient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, icon: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin-moods"],
  { revalidate: 300, tags: ["moods"] }
);

export const getRecipientsForAdmin = unstable_cache(
  async () => {
    const recipientModel = (db as unknown as { recipient?: { findMany: Function } }).recipient;
    if (!recipientModel) {
      return [] as Array<{ id: string; name: string; slug: string }>;
    }

    return recipientModel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }) as Promise<Array<{ id: string; name: string; slug: string }>>;
  },
  ["admin-recipients"],
  { revalidate: 300, tags: ["recipients"] }
);

export const getDiscountsForAdmin = unstable_cache(
  async () => {
    const discountModel = (db as unknown as { discount?: { findMany: Function } }).discount;
    if (!discountModel) {
      return [] as Array<{
        id: string;
        name: string;
        description: string | null;
        value: number;
        type: "PERCENTAGE" | "FIXED";
        isActive: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
      }>;
    }

    return discountModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        value: true,
        type: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<Array<{
      id: string;
      name: string;
      description: string | null;
      value: number;
      type: "PERCENTAGE" | "FIXED";
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
    }>>;
  },
  ["admin-discounts"],
  { revalidate: 300, tags: ["discounts"] }
);