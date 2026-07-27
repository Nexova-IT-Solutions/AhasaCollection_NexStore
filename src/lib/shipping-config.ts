export type ShippingConfigRecord = {
  id: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDeliveryEnabled: boolean;
  expressDeliveryFee: number;
  isDeliveryEnabled: boolean;
  deliveryNote: string | null;
  hideOutOfStockProducts: boolean;
  hideEmptyCategories: boolean;
  updatedAt: Date;
  currency: string;
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfigRecord = {
  id: "default",
  deliveryFee: 350,
  freeDeliveryThreshold: 5000,
  isFreeDeliveryEnabled: true,
  expressDeliveryFee: 650,
  isDeliveryEnabled: true,
  deliveryNote: null,
  hideOutOfStockProducts: false,
  hideEmptyCategories: false,
  updatedAt: new Date(0),
  currency: "LKR",
};

type RawShippingConfigClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

function normalizeShippingConfig(row: Record<string, unknown> | null | undefined): ShippingConfigRecord | null {
  if (!row) return null;

  return {
    id: String(row.id ?? "default"),
    deliveryFee: Number(row.deliveryFee ?? DEFAULT_SHIPPING_CONFIG.deliveryFee),
    freeDeliveryThreshold: Number(row.freeDeliveryThreshold ?? DEFAULT_SHIPPING_CONFIG.freeDeliveryThreshold),
    isFreeDeliveryEnabled: Boolean(row.isFreeDeliveryEnabled ?? DEFAULT_SHIPPING_CONFIG.isFreeDeliveryEnabled),
    expressDeliveryFee: Number(row.expressDeliveryFee ?? DEFAULT_SHIPPING_CONFIG.expressDeliveryFee),
    isDeliveryEnabled: Boolean(row.isDeliveryEnabled ?? DEFAULT_SHIPPING_CONFIG.isDeliveryEnabled),
    deliveryNote: row.deliveryNote === undefined ? null : (row.deliveryNote as string | null),
    hideOutOfStockProducts: Boolean(row.hideOutOfStockProducts ?? DEFAULT_SHIPPING_CONFIG.hideOutOfStockProducts),
    hideEmptyCategories: Boolean(row.hideEmptyCategories ?? DEFAULT_SHIPPING_CONFIG.hideEmptyCategories),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt ?? Date.now())),
    currency: String(row.currency ?? "LKR"),
  };
}

export async function getShippingConfig(client: RawShippingConfigClient): Promise<ShippingConfigRecord | null> {
  const rows = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
    'SELECT "id", "deliveryFee", "freeDeliveryThreshold", "isFreeDeliveryEnabled", "expressDeliveryFee", "isDeliveryEnabled", "deliveryNote", "hideOutOfStockProducts", "hideEmptyCategories", "updatedAt", "currency" FROM "ShippingConfig" WHERE "id" = $1 LIMIT 1',
    DEFAULT_SHIPPING_CONFIG.id,
  );

  return normalizeShippingConfig(rows[0]);
}

export async function ensureShippingConfig(client: RawShippingConfigClient): Promise<ShippingConfigRecord> {
  const existing = await getShippingConfig(client);
  if (existing) {
    return existing;
  }

  await client.$executeRawUnsafe(
    'INSERT INTO "ShippingConfig" ("id", "deliveryFee", "freeDeliveryThreshold", "isFreeDeliveryEnabled", "expressDeliveryFee", "isDeliveryEnabled", "deliveryNote", "hideOutOfStockProducts", "hideEmptyCategories", "updatedAt", "currency") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10) ON CONFLICT ("id") DO NOTHING',
    DEFAULT_SHIPPING_CONFIG.id,
    DEFAULT_SHIPPING_CONFIG.deliveryFee,
    DEFAULT_SHIPPING_CONFIG.freeDeliveryThreshold,
    DEFAULT_SHIPPING_CONFIG.isFreeDeliveryEnabled,
    DEFAULT_SHIPPING_CONFIG.expressDeliveryFee,
    DEFAULT_SHIPPING_CONFIG.isDeliveryEnabled,
    DEFAULT_SHIPPING_CONFIG.deliveryNote,
    DEFAULT_SHIPPING_CONFIG.hideOutOfStockProducts,
    DEFAULT_SHIPPING_CONFIG.hideEmptyCategories,
    DEFAULT_SHIPPING_CONFIG.currency,
  );

  return (await getShippingConfig(client)) ?? DEFAULT_SHIPPING_CONFIG;
}

export async function upsertShippingConfig(
  client: RawShippingConfigClient,
  input: {
    deliveryFee?: number;
    freeDeliveryThreshold?: number;
    isFreeDeliveryEnabled?: boolean;
    expressDeliveryFee?: number;
    isDeliveryEnabled?: boolean;
    deliveryNote?: string | null;
    hideOutOfStockProducts?: boolean;
    hideEmptyCategories?: boolean;
    currency?: string;
  }
): Promise<ShippingConfigRecord> {
  const deliveryFee = input.deliveryFee ?? DEFAULT_SHIPPING_CONFIG.deliveryFee;
  const freeDeliveryThreshold = input.freeDeliveryThreshold ?? DEFAULT_SHIPPING_CONFIG.freeDeliveryThreshold;
  const isFreeDeliveryEnabled = input.isFreeDeliveryEnabled ?? DEFAULT_SHIPPING_CONFIG.isFreeDeliveryEnabled;
  const expressDeliveryFee = input.expressDeliveryFee ?? DEFAULT_SHIPPING_CONFIG.expressDeliveryFee;
  const isDeliveryEnabled = input.isDeliveryEnabled ?? DEFAULT_SHIPPING_CONFIG.isDeliveryEnabled;
  const deliveryNote = input.deliveryNote ?? null;
  const hideOutOfStockProducts = input.hideOutOfStockProducts ?? DEFAULT_SHIPPING_CONFIG.hideOutOfStockProducts;
  const hideEmptyCategories = input.hideEmptyCategories ?? DEFAULT_SHIPPING_CONFIG.hideEmptyCategories;
  const currency = input.currency ?? DEFAULT_SHIPPING_CONFIG.currency;

  const updatedCount = await client.$executeRawUnsafe(
    'UPDATE "ShippingConfig" SET "deliveryFee" = $1, "freeDeliveryThreshold" = $2, "isFreeDeliveryEnabled" = $3, "expressDeliveryFee" = $4, "isDeliveryEnabled" = $5, "deliveryNote" = $6, "hideOutOfStockProducts" = $7, "hideEmptyCategories" = $8, "currency" = $9, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $10',
    deliveryFee,
    freeDeliveryThreshold,
    isFreeDeliveryEnabled,
    expressDeliveryFee,
    isDeliveryEnabled,
    deliveryNote,
    hideOutOfStockProducts,
    hideEmptyCategories,
    currency,
    DEFAULT_SHIPPING_CONFIG.id,
  );

  if (updatedCount === 0) {
    await client.$executeRawUnsafe(
      'INSERT INTO "ShippingConfig" ("id", "deliveryFee", "freeDeliveryThreshold", "isFreeDeliveryEnabled", "expressDeliveryFee", "isDeliveryEnabled", "deliveryNote", "hideOutOfStockProducts", "hideEmptyCategories", "updatedAt", "currency") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)',
      DEFAULT_SHIPPING_CONFIG.id,
      deliveryFee,
      freeDeliveryThreshold,
      isFreeDeliveryEnabled,
      expressDeliveryFee,
      isDeliveryEnabled,
      deliveryNote,
      hideOutOfStockProducts,
      hideEmptyCategories,
      currency,
    );
  }

  return (await getShippingConfig(client)) ?? {
    ...DEFAULT_SHIPPING_CONFIG,
    deliveryFee,
    freeDeliveryThreshold,
    isFreeDeliveryEnabled,
    expressDeliveryFee,
    isDeliveryEnabled,
    deliveryNote,
    hideOutOfStockProducts,
    hideEmptyCategories,
    currency,
  };
}