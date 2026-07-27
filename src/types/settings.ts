export interface StoreConfig {
  id: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDeliveryEnabled: boolean;
  expressDeliveryFee: number;
  isDeliveryEnabled: boolean;
  deliveryNote?: string | null;
  hideOutOfStockProducts: boolean;
  hideEmptyCategories: boolean;
  updatedAt: string;
}
