import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, Product, CustomBox, GiftBox } from "@/types";
import type { SpecialTouchProduct } from "@/lib/special-touch";

const CART_STORAGE_KEY = "giftbox-lanka-cart-v2";
const LEGACY_CART_STORAGE_KEY = "giftbox-lanka-cart";

const cartStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  return {
    getItem: (name) => {
      const currentValue = window.localStorage.getItem(name);
      if (currentValue !== null) {
        return currentValue;
      }

      if (name === CART_STORAGE_KEY) {
        const legacyValue = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
        if (legacyValue !== null) {
          window.localStorage.setItem(CART_STORAGE_KEY, legacyValue);
          return legacyValue;
        }
      }

      return null;
    },
    setItem: (name, value) => {
      window.localStorage.setItem(name, value);
      if (name === CART_STORAGE_KEY) {
        window.localStorage.setItem(LEGACY_CART_STORAGE_KEY, value);
      }
    },
    removeItem: (name) => {
      window.localStorage.removeItem(name);
      if (name === CART_STORAGE_KEY) {
        window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      }
    },
  };
});

export interface PackagingOption {
  id: string;
  name: string;
  price: number;
  description?: string;
  icon?: string;
}

export const PACKAGING_OPTIONS: PackagingOption[] = [
  {
    id: "standard",
    name: "Standard Eco-friendly Packing",
    price: 0,
    description: "Recycled brown paper & hemp twine",
    icon: "Leaf"
  },
  {
    id: "premium",
    name: "Premium Gift Box",
    price: 0,
    description: "Luxury hard-shell box with ribbon",
    icon: "Box"
  }
];

/** Tracks an individual item whose price shifted during a sync */
export interface PriceChangedItem {
  id: string;
  name: string;
  oldPrice: number;
  newPrice: number;
}

interface CartState {
  items: CartItem[];
  specialTouchProducts: SpecialTouchProduct[];
  isCartOpen: boolean;
  /** True once Zustand has rehydrated from localStorage – use this to gate SSR renders */
  isHydrated: boolean;
  setHydrated: () => void;

  // Price-change tracking
  priceChangedItems: PriceChangedItem[];
  clearPriceChangeFlags: () => void;

  // Actions
  addItem: (product: Product, quantity?: number, variantId?: string, variantName?: string) => void;
  addToCart: (product: Product, variantSelection?: any, quantity?: number) => void;
  addGiftBox: (giftBox: GiftBox, quantity?: number) => void;
  addCustomBox: (customBox: CustomBox, quantity?: number) => void;
  addCustomBoxToCart: (boxConfig: {
    wrapId: string;
    giftMessage: string;
    noteStyle: string;
    items: Array<{ productId: string; quantity: number; selectedSize?: string; selectedColor?: string; variantName?: string }>;
    boxType?: any;
  }) => Promise<void>;
  addVirtualGiftCard: (initialValue: number, quantity?: number) => void;
  setSpecialTouchProducts: (products: SpecialTouchProduct[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  setItems: (items: CartItem[]) => void;
  syncCart: () => Promise<void>;

  // Gift Card System
  appliedGiftCard: { code: string; cardId: string; deductionAmount: number; balance: number } | null;
  /**
   * Call when a gift card is first applied.
   * @param extraFees - Sum of ALL fees beyond subtotal: deliveryFee + wrappingFee + paymentFee
   */
  setGiftCard: (giftCard: { code: string; cardId: string; balance: number }, extraFees: number) => void;
  clearGiftCard: () => void;
  /**
   * Call whenever any fee or the subtotal changes so the deduction stays in bounds.
   * @param extraFees - Sum of ALL fees beyond subtotal: deliveryFee + wrappingFee + paymentFee
   */
  recalculateGiftCardDeduction: (extraFees: number) => void;

  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  validateCartStock: () => Promise<{ valid: boolean; errors: string[] }>;

  // Packaging
  selectedPackaging: PackagingOption;
  setPackaging: (packaging: PackagingOption) => void;

  // Validation
  syncPrices: (liveItems: any[]) => { pricesChanged: boolean; itemsRemoved: boolean };

  // Computed
  getSubtotal: () => number;
  getItemCount: () => number;
  getTotalSaved: () => number;
}

let lastSyncId = 0;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      specialTouchProducts: [],
      isCartOpen: false,
      isHydrated: false,
      appliedGiftCard: null,
      selectedPackaging: PACKAGING_OPTIONS[0],
      priceChangedItems: [],

      setHydrated: () => set({ isHydrated: true }),
      clearPriceChangeFlags: () => set({ priceChangedItems: [] }),

      setPackaging: (packaging) => set({ selectedPackaging: packaging }),

      setGiftCard: (giftCard, extraFees) => {
        const subtotal = get().getSubtotal();
        // Grand Total = Subtotal + all extra fees (delivery + wrapping + payment)
        const totalPayable = subtotal + extraFees;
        const deductionAmount = Math.min(totalPayable, giftCard.balance);
        set({ appliedGiftCard: { ...giftCard, deductionAmount } });
      },

      clearGiftCard: () => set({ appliedGiftCard: null }),

      recalculateGiftCardDeduction: (extraFees) => {
        const { appliedGiftCard } = get();
        if (!appliedGiftCard) return;
        const subtotal = get().getSubtotal();
        // Recalculate deduction ceiling against the live full payable amount
        const totalPayable = subtotal + extraFees;
        const deductionAmount = Math.min(totalPayable, appliedGiftCard.balance);
        set({ appliedGiftCard: { ...appliedGiftCard, deductionAmount } });
      },

      addToCart: (product: Product, variantSelection?: any, quantity = 1) => {
        console.log("[useCartStore:addToCart] Triggered with:", {
          productId: product.id,
          productName: product.name,
          variantSelection,
          quantity
        });
        const { items } = get();
        const variantId = variantSelection?.variantId;
        
        // Map VariantSelection to ProductVariant for CartItem
        const variant = variantSelection ? {
          id: variantSelection.variantId,
          name: `${variantSelection.size} ${variantSelection.color ? `/ ${variantSelection.color.split('|')[0]}` : ''}`.trim(),
          price: variantSelection.price || (product.salePrice && product.salePrice < product.price ? product.salePrice : product.price),
          inStock: variantSelection.stock > 0,
          originalPrice: variantSelection.price || product.price
        } : undefined;

        console.log("[useCartStore:addToCart] Resolved variant details:", variant);

        const existingItem = items.find(
          item => item.product?.id === product.id && item.selectedVariant?.id === variantId
        );

        if (existingItem) {
          set({
            items: items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const price = Number(
            variant
              ? variant.price
              : product.salePrice && product.salePrice < product.price
              ? product.salePrice
              : product.price
          );

          const originalPrice = Number(
            variant
              ? variant.originalPrice || variant.price
              : product.originalPrice && product.originalPrice > product.price
              ? product.originalPrice
              : product.salePrice && product.salePrice < product.price
              ? product.price
              : product.price
          );

          const newItem: CartItem = {
            id: `${product.id}${variantId ? `-${variantId}` : ''}`,
            type: "product",
            product,
            quantity,
            selectedVariant: variant,
            variantName: variant?.name,
            price,
            originalPrice,
            subtotal: price * quantity,
          };
          set({ items: [...items, newItem] });
        }
        get().syncCart();
      },

      addItem: (product: Product, quantity = 1, variantId?: string, variantName?: string) => {
        console.log("[useCartStore:addItem] Triggered with:", {
          productId: product.id,
          productName: product.name,
          quantity,
          variantId,
          variantName
        });
        const { items } = get();
        const variant = variantId 
          ? product.variants?.find(v => v.id === variantId) 
          : undefined;
        
        console.log("[useCartStore:addItem] Resolved variant details:", variant);

        const existingItem = items.find(
          item => item.product?.id === product.id && item.selectedVariant?.id === variantId
        );

        if (existingItem) {
          console.log("[useCartStore:addItem] Incrementing quantity of existing item:", existingItem.id);
          set({
            items: items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const price = Number(
            variant
              ? variant.price
              : product.salePrice && product.salePrice < product.price
              ? product.salePrice
              : product.price
          );

          const originalPrice = Number(
            variant
              ? variant.originalPrice || variant.price
              : product.originalPrice && product.originalPrice > product.price
              ? product.originalPrice
              : product.salePrice && product.salePrice < product.price
              ? product.price
              : product.price
          );

          const newItem: CartItem = {
            id: `${product.id}${variantId ? `-${variantId}` : ''}`,
            type: "product",
            product,
            quantity,
            selectedVariant: variant,
            variantName: variantName || variant?.name,
            price,
            originalPrice,
            subtotal: price * quantity,
          };
          console.log("[useCartStore:addItem] Adding new item to cart:", newItem);
          set({ items: [...items, newItem] });
        }
        get().syncCart();
      },

      addGiftBox: (giftBox: GiftBox, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find(item => item.giftBox?.id === giftBox.id);

        if (existingItem) {
          set({
            items: items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          const price = giftBox.salePrice && giftBox.salePrice < giftBox.price
            ? giftBox.salePrice
            : giftBox.price;

          const originalPrice = giftBox.originalPrice && giftBox.originalPrice > giftBox.price
            ? giftBox.originalPrice
            : giftBox.salePrice && giftBox.salePrice < giftBox.price
            ? giftBox.price
            : giftBox.price;

          const newItem: CartItem = {
            id: `giftbox-${giftBox.id}`,
            type: "giftbox",
            giftBox,
            quantity,
            price,
            originalPrice,
            subtotal: price * quantity,
          };
          set({ items: [...items, newItem] });
        }
        get().syncCart();
      },

      addCustomBox: (customBox: CustomBox, quantity = 1) => {
        const { items } = get();
        const id = `custombox-${Date.now()}`;
        
        // Calculate total price
        const itemsTotal = customBox.items.reduce(
          (sum, item) => sum + item.item.price * item.quantity,
          0
        );
        const wrappingTotal = customBox.wrapping?.price || 0;
        const noteTotal = customBox.noteStyle?.price || 0;
        const total = (customBox.boxType.basePrice + itemsTotal + wrappingTotal + noteTotal) * quantity;

        const newItem: CartItem = {
          id,
          type: "custombox",
          customBox,
          quantity,
          subtotal: total,
        };
        set({ items: [...items, newItem] });
        get().syncCart();
      },

      addCustomBoxToCart: async (boxConfig) => {
        try {
          const response = await fetch("/api/cart/add-custom-box", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(boxConfig),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to add custom box to cart");
          }

          const validatedData = await response.json();
          const { items } = get();
          const id = `custombox-${Date.now()}`;

          const newItem: CartItem = {
            id,
            type: "custombox",
            customBox: {
              boxType: boxConfig.boxType || {
                id: "standard-custom-box",
                name: "Premium Gift Box",
                description: "Our signature luxury gift box",
                capacity: 100,
                basePrice: 0,
                image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
              },
              items: validatedData.items,
              message: validatedData.message,
              wrapping: validatedData.wrapping,
              noteStyle: validatedData.noteStyle,
            },
            quantity: 1,
            subtotal: validatedData.subtotal,
            price: validatedData.subtotal,
            originalPrice: validatedData.subtotal,
          };

          const updatedItems = [...items, newItem];
          set({ items: updatedItems, isCartOpen: true });

          await get().syncCart();
        } catch (error) {
          console.error("[addCustomBoxToCart] Error adding custom box:", error);
          throw error;
        }
      },

      addVirtualGiftCard: (initialValue: number, quantity = 1) => {
        const { items } = get();
        
        // Find if we already have this exact gift card value in cart
        const existingItemIndex = items.findIndex(
          (item) => item.type === "giftcard" && item.virtualGiftCard?.initialValue === initialValue
        );

        if (existingItemIndex > -1) {
          const updatedItems = [...items];
          const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
          updatedItems[existingItemIndex].quantity = newQuantity;
          updatedItems[existingItemIndex].subtotal = initialValue * newQuantity;
          
          set({ items: updatedItems, isCartOpen: true });
        } else {
          const newItem: CartItem = {
            id: `giftcard-${initialValue}-${Date.now()}`,
            type: "giftcard",
            virtualGiftCard: { initialValue, currency: "LKR" },
            quantity,
            subtotal: initialValue * quantity,
            isDigital: true,
          };
          set({ items: [...items, newItem], isCartOpen: true });
        }
        get().syncCart();
      },

      setSpecialTouchProducts: (products: SpecialTouchProduct[]) => {
        set({ specialTouchProducts: products });
      },

      removeItem: (itemId: string) => {
        // 1. Optimistically remove from local state immediately
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));

        // 2. Persist the removal to the DB for authenticated users.
        //    Fire-and-forget: if it fails we log, but the local state is
        //    already correct. On the next merge the DB will still have the
        //    item, so we also attempt the DELETE silently.
        fetch(`/api/cart/merge?itemId=${encodeURIComponent(itemId)}`, {
          method: "DELETE",
        }).catch((err) => {
          console.error("[removeItem] Failed to persist removal to DB:", err);
        });
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        set(state => ({
          items: state.items.map(item => {
            if (item.id === itemId) {
              let price = item.price || 0;
              if (!price) {
                if (item.type === "product") {
                  price = item.selectedVariant?.price || item.product?.salePrice || item.product?.price || 0;
                } else if (item.type === "giftbox") {
                  price = item.giftBox?.price || 0;
                } else if (item.type === "custombox" && item.customBox) {
                  const itemsTotal = item.customBox.items.reduce(
                    (sum, i) => sum + i.item.price * i.quantity,
                    0
                  );
                  price = item.customBox.boxType.basePrice + itemsTotal + 
                    (item.customBox.wrapping?.price || 0) + 
                    (item.customBox.noteStyle?.price || 0);
                } else if (item.type === "giftcard" && item.virtualGiftCard) {
                  price = item.virtualGiftCard.initialValue;
                }
              }
              return { ...item, quantity, subtotal: price * quantity };
            }
            return item;
          }),
        }));
        await get().syncCart();
      },

      setItems: (items: CartItem[]) => {
        // Step 6: Guard against corrupted data from any source
        const corrupted = items.some(item => item.quantity > 100);
        if (corrupted) {
          console.warn("Attempted to set corrupted items, clearing instead.");
          set({ items: [], appliedGiftCard: null });
        } else {
          set({ items });
        }
      },

      clearCart: async () => {
        try {
          if (typeof window !== "undefined") {
            await fetch("/api/cart/clear", { method: "DELETE" });
          }
        } catch (error) {
          console.error("Failed to clear cart on server", error);
        }
        set({ items: [], appliedGiftCard: null });
      },

      syncCart: async () => {
        try {
          const currentSyncId = ++lastSyncId;
          const { items } = get();
          const res = await fetch("/api/cart/merge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ items, overwrite: true }),
          });
          if (res.ok && currentSyncId === lastSyncId) {
            const data = await res.json();
            if (Array.isArray(data.items)) {
              set({ items: data.items });
            }
          }
        } catch (err) {
          console.error("[syncCart] Failed to sync cart with database:", err);
        }
      },
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set(state => ({ isCartOpen: !state.isCartOpen })),

      validateCartStock: async () => {
        const { items } = get();
        if (items.length === 0) return { valid: true, errors: [] };

        const itemsToValidate = items.flatMap(item => {
          if (item.type === "product" && item.product) {
            return [{ productId: item.product.id, quantity: item.quantity }];
          }
          if (item.type === "giftbox" && item.giftBox) {
            return [{ productId: item.giftBox.id, quantity: item.quantity }];
          }
          if (item.type === "custombox" && item.customBox) {
            return item.customBox.items.map(ci => ({ 
              productId: ci.item.id, 
              quantity: ci.quantity * item.quantity 
            }));
          }
          return [];
        });

        try {
          const res = await fetch("/api/checkout/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: itemsToValidate }),
          });
          
          if (!res.ok && res.status !== 400) {
            return { valid: true, errors: [] }; // Assume valid if error is not explicit
          }

          const data = await res.json();
          const outOfStockIds = data.outOfStockIds || [];

          set(state => ({
            items: state.items.map(item => {
              let isOutOfStock = false;
              if (item.type === "product" && item.product) {
                isOutOfStock = outOfStockIds.includes(item.product.id);
              } else if (item.type === "giftbox" && item.giftBox) {
                isOutOfStock = outOfStockIds.includes(item.giftBox.id);
              } else if (item.type === "custombox" && item.customBox) {
                isOutOfStock = item.customBox.items.some(ci => outOfStockIds.includes(ci.item.id));
              }
              return { ...item, isOutOfStock };
            })
          }));

          return { valid: data.valid, errors: data.errors || [] };
        } catch (error) {
          console.error("Cart validation error:", error);
          return { valid: true, errors: [] }; // Fail open
        }
      },

      syncPrices: (liveItems: any[]) => {
        const { items } = get();
        let pricesChanged = false;
        let itemsRemoved = false;
        const changedRecords: PriceChangedItem[] = [];

        const nextItems = items.map(item => {
          // If it has a variant, LOCK the price and skip recalculation
          if (item.selectedVariant) {
            return item;
          }

          const live = liveItems.find((l: any) => l.cartItemId === item.id) || liveItems.find((l: any) => l.id === (item.product?.id || item.giftBox?.id || item.id));

          // Clone so we don't mutate in-place
          const updated = { ...item };

          if (live && !live.isAvailable) {
            updated.isOutOfStock = true;
          } else {
            updated.isOutOfStock = false;
          }

          if (live && live.currentPrice !== undefined) {
            // Determine the price the customer was seeing in their cart
            const oldEffectivePrice = Number(updated.price || 0);
            const newEffectivePrice = Number(live.currentPrice);

            if (oldEffectivePrice > 0 && newEffectivePrice !== oldEffectivePrice) {
              pricesChanged = true;
              changedRecords.push({
                id: updated.id,
                name: updated.product?.name || updated.giftBox?.name || "Item",
                oldPrice: oldEffectivePrice,
                newPrice: newEffectivePrice,
              });
            }

            // Sync the effective selling price
            updated.price = newEffectivePrice;
            updated.subtotal = newEffectivePrice * updated.quantity;

            // Compute the new originalPrice for correct strikethrough logic.
            // originalPrice is only meaningful when it is HIGHER than the selling price.
            const liveBasePrice = Number(live.currentBasePrice ?? live.currentPrice);
            if (liveBasePrice > newEffectivePrice) {
              updated.originalPrice = liveBasePrice;
            } else {
              // No discount situation → clear originalPrice to prevent inverted strikethrough
              updated.originalPrice = undefined;
            }

            // Keep the nested product/giftBox objects consistent for downstream helpers
            if (updated.type === "product" && updated.product) {
              updated.product = {
                ...updated.product,
                price: liveBasePrice,
                salePrice: live.currentSalePrice ?? undefined,
              };
            } else if (updated.type === "giftbox" && updated.giftBox) {
              updated.giftBox = {
                ...updated.giftBox,
                price: liveBasePrice,
                salePrice: live.currentSalePrice ?? undefined,
              };
            }
          }

          return updated;
        });

        if (pricesChanged || itemsRemoved) {
          set({ items: nextItems, priceChangedItems: changedRecords });
        }

        return { pricesChanged, itemsRemoved };
      },

      getSubtotal: () => {
        // Guard: Number() coerces strings that survive JSON.parse from localStorage
        return get().items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      },

      getTotalSaved: () => {
        return get().items.reduce((sum, item) => {
          const price = Number(item.price || 0);
          const quantity = Number(item.quantity || 0);

          // 1. Variant Item Logic: NEVER inherit top-level originalPrice.
          if (item.selectedVariant) {
            const vPrice = Number(item.selectedVariant.price || 0);
            const vOriginal = Number(item.selectedVariant.originalPrice || 0);
            if (vOriginal > 0 && vOriginal > vPrice) {
              return sum + (vOriginal - vPrice) * quantity;
            }
            return sum; // Safely skip variant if no genuine variant-level discount exists
          }

          // 2. Standard Item Logic
          const originalPrice = Number(item.originalPrice || 0);
          if (originalPrice > 0 && originalPrice > price) {
            return sum + (originalPrice - price) * quantity;
          }

          // Fallback for legacy items already in localStorage without top-level price fields:
          if (item.type === "product" && item.product) {
            const pPrice = Number(item.product.price || 0);
            const pOriginal = Number(item.product.originalPrice || 0);
            const pSale = Number(item.product.salePrice || 0);
            if (pOriginal > 0 && pOriginal > pPrice) {
              return sum + (pOriginal - pPrice) * quantity;
            }
            if (pSale > 0 && pSale < pPrice) {
              return sum + (pPrice - pSale) * quantity;
            }
          }
          if (item.type === "giftbox" && item.giftBox) {
            const gbPrice = Number(item.giftBox.price || 0);
            const gbOriginal = Number(item.giftBox.originalPrice || 0);
            const gbSale = Number(item.giftBox.salePrice || 0);
            if (gbOriginal > 0 && gbOriginal > gbPrice) {
              return sum + (gbOriginal - gbPrice) * quantity;
            }
            if (gbSale > 0 && gbSale < gbPrice) {
              return sum + (gbPrice - gbSale) * quantity;
            }
          }
          return sum;
        }, 0);
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: cartStorage,
      partialize: (state) => ({ items: state.items }),
      skipHydration: false,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Guard against corrupted quantities
          const corrupted = state.items.some(item => Number(item.quantity) > 100);
          if (corrupted) {
            console.warn("Corrupted cart state detected, resetting cart.");
            state.clearCart();
          }
          state.setHydrated();
        }
      },
    }
  )
);
