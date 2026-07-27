import { cache } from "react";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

export const getStoreConfig = cache(async () => {
  const config = await withDbRetry(() => db.shippingConfig.findUnique({
    where: { id: "default" },
  }), { label: "getStoreConfig" });

  if (!config) {
    return withDbRetry(() => db.shippingConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }), { label: "getStoreConfig (upsert)" });
  }

  return config;
});
