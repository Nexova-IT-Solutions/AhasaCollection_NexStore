import { create } from "zustand";
import type { PosCartItem, PosCustomer, PosPayment, PosShiftData, SplitPaymentEntry } from "@/types/pos";

interface PosCartState {
  // Cart items
  items: PosCartItem[];
  
  // Customer
  customer: PosCustomer | null;

  // Active shift
  activeShift: PosShiftData | null;

  // Payment state
  payment: PosPayment;

  // UI states
  isCheckoutOpen: boolean;
  isShiftModalOpen: boolean;
  shiftModalMode: "open" | "close";
  isProcessing: boolean;
  lastOrderNumber: string | null;
  notes: string;
  isScanning: boolean;

  // Cart Actions
  addItem: (product: {
    id: string;
    name: string;
    nameAr?: string | null;
    sku: string | null;
    price: number;
    salePrice: number | null;
    stock: number;
    image: string | null;
    discountName?: string | null;
    discountValue?: number | null;
    discountType?: string | null;
    isEGiftCard?: boolean;
    giftCardValue?: number | null;
    giftCardCode?: string;
    recipientEmail?: string | null;
    personalMessage?: string | null;
  }) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  setManualDiscount: (id: string, discountPercent: number) => void;
  setItemDiscount: (id: string, discount: { id: string | null; name: string | null; type: "PERCENTAGE" | "FIXED" | null; value: number | null }) => void;
  clearCart: () => void;

  // Barcode Scan Action
  scanBarcode: (barcode: string) => Promise<{
    success: boolean;
    type?: "product" | "giftcard";
    message?: string;
  }>;

  // Customer Actions
  setCustomer: (customer: PosCustomer | null) => void;
  clearCustomer: () => void;

  // Shift Actions
  setActiveShift: (shift: PosShiftData | null) => void;
  fetchActiveShift: () => Promise<void>;

  // Payment Actions
  setPaymentMethod: (method: PosPayment["method"]) => void;
  setCashTendered: (amount: number) => void;
  setCardReference: (ref: string) => void;
  setGiftCardCode: (code: string) => void;
  setGiftCardDeduction: (amount: number) => void;
  setSplitPayments: (payments: SplitPaymentEntry[]) => void;
  resetPayment: () => void;

  // Notes
  setNotes: (notes: string) => void;

  // UI Actions
  openCheckout: () => void;
  closeCheckout: () => void;
  openShiftModal: (mode: "open" | "close") => void;
  closeShiftModal: () => void;
  setProcessing: (processing: boolean) => void;
  setLastOrderNumber: (orderNumber: string | null) => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getChangeDue: () => number;
}

const defaultPayment: PosPayment = {
  method: "POS_CASH",
  cashTendered: 0,
  changeDue: 0,
  cardReference: "",
  giftCardCode: "",
  giftCardDeduction: 0,
  splitPayments: [],
};

export const usePosCart = create<PosCartState>()((set, get) => ({
  items: [],
  customer: null,
  activeShift: null,
  payment: { ...defaultPayment },
  isCheckoutOpen: false,
  isShiftModalOpen: false,
  shiftModalMode: "open",
  isProcessing: false,
  lastOrderNumber: null,
  notes: "",
  isScanning: false,

  // ─── Cart Actions ──────────────────────────────────────────
  addItem: (product) => {
    if (product.isEGiftCard) return; // Do not accept eGift Cards in POS cart
    const { items } = get();
    const existingIndex = items.findIndex((item) => item.productId === product.id);
    const isGiftCard = (product.isEGiftCard ?? false) || !!product.giftCardCode;

    if (existingIndex > -1) {
      const existing = items[existingIndex];

      // Gift card items are capped at qty=1 each entry.
      // Each physical card needs its own unique barcode — you cannot activate
      // two different cards with one checkout entry. The operator should
      // add the same product again to create a separate entry.
      if (isGiftCard) {
        // Instead of incrementing qty, add a new independent line item
        // so each card gets its own activation slot in the checkout modal.
        const newItem: PosCartItem = {
          id: `${product.id}-${Date.now()}`, // unique cart entry id
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr || null,
          sku: product.sku,
          price: product.price,
          salePrice: product.salePrice,
          effectivePrice: existing.effectivePrice,
          quantity: 1,
          subtotal: existing.effectivePrice,
          image: product.image,
          stock: product.stock,
          discountPercent: existing.discountPercent,
          manualDiscount: 0,
          isGiftCard: true,
          isPhysical: product.isEGiftCard !== undefined ? !product.isEGiftCard : true,
          giftCardValue: product.giftCardValue ?? null,
          giftCardCode: product.giftCardCode,
          recipientEmail: product.recipientEmail ?? null,
          personalMessage: product.personalMessage ?? null,
        };
        set({ items: [...items, newItem] });
        return;
      }

      // Regular product: increment quantity if within stock
      if (existing.quantity >= product.stock) return;
      const updatedItems = [...items];
      const newQty = existing.quantity + 1;
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        subtotal: existing.effectivePrice * newQty,
      };
      set({ items: updatedItems });
    } else {
      // Calculate effective price
      let effectivePrice = product.price;
      let discountPercent = 0;

      if (product.salePrice && product.salePrice < product.price) {
        effectivePrice = product.salePrice;
      }

      // Apply product discount if exists
      if (product.discountValue && product.discountType) {
        if (product.discountType === "PERCENTAGE") {
          discountPercent = product.discountValue;
          effectivePrice = product.price * (1 - product.discountValue / 100);
        } else if (product.discountType === "FIXED") {
          effectivePrice = Math.max(0, product.price - product.discountValue);
          discountPercent = product.price > 0 ? (product.discountValue / product.price) * 100 : 0;
        }
      }

      // If salePrice is lower than discount price, use salePrice
      if (product.salePrice && product.salePrice < effectivePrice) {
        effectivePrice = product.salePrice;
        discountPercent = product.price > 0
          ? ((product.price - effectivePrice) / product.price) * 100
          : 0;
      }

      effectivePrice = Math.round(effectivePrice * 100) / 100;

      const newItem: PosCartItem = {
        id: product.id,
        productId: product.id,
        name: product.name,
        nameAr: product.nameAr || null,
        sku: product.sku,
        price: product.price,
        salePrice: product.salePrice,
        effectivePrice: effectivePrice,
        quantity: 1,
        subtotal: effectivePrice,
        image: product.image,
        stock: product.stock,
        discountPercent: Math.round(discountPercent * 100) / 100,
        manualDiscount: 0,
        isGiftCard,
        isPhysical: isGiftCard ? (product.isEGiftCard !== undefined ? !product.isEGiftCard : true) : undefined,
        giftCardValue: product.giftCardValue ?? null,
        giftCardCode: product.giftCardCode,
        recipientEmail: product.recipientEmail ?? null,
        personalMessage: product.personalMessage ?? null,
      };

      set({ items: [...items, newItem] });
    }
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  updateItemQuantity: (id, quantity) => {
    if (quantity < 1) {
      get().removeItem(id);
      return;
    }

    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id) {
          const clampedQty = Math.min(quantity, item.stock);
          let price = item.effectivePrice;

          // Apply manual discount if set
          if (item.manualDiscount > 0) {
            price = item.price * (1 - item.manualDiscount / 100);
            price = Math.round(price * 100) / 100;
          }

          return {
            ...item,
            quantity: clampedQty,
            subtotal: Math.round(price * clampedQty * 100) / 100,
          };
        }
        return item;
      }),
    }));
  },

  setManualDiscount: (id, discountPercent) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id) {
          const clamped = Math.max(0, Math.min(100, discountPercent));
          const newEffective = Math.round(item.price * (1 - clamped / 100) * 100) / 100;
          return {
            ...item,
            manualDiscount: clamped,
            effectivePrice: newEffective,
            discountPercent: clamped,
            discountId: null,
            discountName: `Manual ${clamped}%`,
            discountType: "PERCENTAGE",
            discountValue: clamped,
            subtotal: Math.round(newEffective * item.quantity * 100) / 100,
          };
        }
        return item;
      }),
    }));
  },

  setItemDiscount: (id, discount) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id) {
          let newEffective = item.price;
          let computedPercent = 0;
          
          if (discount.value !== null && discount.type) {
            if (discount.type === "PERCENTAGE") {
              newEffective = Math.round(item.price * (1 - discount.value / 100) * 100) / 100;
              computedPercent = discount.value;
            } else if (discount.type === "FIXED") {
              newEffective = Math.max(0, item.price - discount.value);
              computedPercent = item.price > 0 ? (discount.value / item.price) * 100 : 0;
            }
          }

          // Ensure salePrice takes precedence if it's lower
          if (item.salePrice && item.salePrice < newEffective && !discount.value) {
            newEffective = item.salePrice;
            computedPercent = item.price > 0 ? ((item.price - newEffective) / item.price) * 100 : 0;
          }

          return {
            ...item,
            effectivePrice: newEffective,
            discountPercent: Math.round(computedPercent * 100) / 100,
            discountId: discount.id,
            discountName: discount.name,
            discountType: discount.type,
            discountValue: discount.value,
            manualDiscount: 0,
            subtotal: Math.round(newEffective * item.quantity * 100) / 100,
          };
        }
        return item;
      }),
    }));
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      payment: { ...defaultPayment },
      notes: "",
      lastOrderNumber: null,
    });
  },

  // ─── Barcode Scan Action ────────────────────────────────────
  scanBarcode: async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) {
      return { success: false, message: "Empty barcode" };
    }

    set({ isScanning: true });

    try {
      const res = await fetch(`/api/admin/pos/products/scan?barcode=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.message || "Product not found",
        };
      }

      if (data.type === "product" && data.product) {
        const p = data.product;

        if (p.stock <= 0) {
          return {
            success: false,
            type: "product",
            message: `${p.name} is out of stock`,
          };
        }

        // When the scanned barcode resolved to a variant-level SKU (e.g. "SKU-M-RED"),
        // the API returns a `resolvedVariant` object. We use a composite id so this
        // variant becomes its own line item, bypassing the variant selection modal.
        const rv = data.resolvedVariant as
          | { variantId: string; size: string; color: string; stock: number; sku: string }
          | undefined;

        const cartItemId = rv ? `${p.id}-${rv.variantId}` : p.id;

        // Add the scanned product to cart
        get().addItem({
          id: cartItemId,
          name: p.name,
          nameAr: p.nameAr,
          sku: p.sku,
          price: p.price,
          salePrice: p.salePrice,
          stock: rv ? rv.stock : p.stock,
          image: p.image,
          discountName: p.discountName,
          discountValue: p.discountValue,
          discountType: p.discountType,
          isEGiftCard: p.isEGiftCard ?? false,
          giftCardValue: p.giftCardValue ?? null,
        });

        return {
          success: true,
          type: "product",
          message: `Added ${p.name}`,
        };
      }

      if (data.type === "giftcard" && data.giftCard) {
        const gc = data.giftCard;

        if (!gc.isUsable) {
          return {
            success: false,
            type: "giftcard",
            message: gc.isExpired
              ? "Gift card has expired"
              : gc.balance <= 0
              ? "Gift card has no remaining balance"
              : "Gift card is not usable",
          };
        }

        // Auto-switch payment method to POS_GIFT_CARD and populate code + deduction.
        // Previously only giftCardCode was set, leaving method as POS_CASH, meaning
        // operators had to manually switch tabs before checkout — now it's automatic.
        set((state) => ({
          payment: {
            ...state.payment,
            method: "POS_GIFT_CARD",
            giftCardCode: gc.code || gc.barcode || "",
            giftCardDeduction: Math.min(gc.balance, get().getTotal()),
          },
        }));

        return {
          success: true,
          type: "giftcard",
          message: `Gift card found — Balance: Rs.${gc.balance.toFixed(3)}`,
        };
      }

      return {
        success: false,
        message: "Unknown scan result",
      };
    } catch (error) {
      console.error("[POS Scan] Error:", error);
      return {
        success: false,
        message: "Failed to scan barcode",
      };
    } finally {
      set({ isScanning: false });
    }
  },

  // ─── Customer Actions ──────────────────────────────────────
  setCustomer: (customer) => set({ customer }),
  clearCustomer: () => set({ customer: null }),

  // ─── Shift Actions ─────────────────────────────────────────
  setActiveShift: (shift) => set({ activeShift: shift }),

  fetchActiveShift: async () => {
    try {
      const res = await fetch("/api/admin/pos/shifts/close");
      const data = await res.json();

      if (data.success && data.shift) {
        set({ activeShift: data.shift });
      } else {
        set({ activeShift: null });
      }
    } catch (error) {
      console.error("[POS] Failed to fetch active shift:", error);
    }
  },

  // ─── Payment Actions ───────────────────────────────────────
  setPaymentMethod: (method) =>
    set((state) => ({
      payment: { ...state.payment, method },
    })),

  setCashTendered: (amount) =>
    set((state) => {
      const total = get().getTotal();
      return {
        payment: {
          ...state.payment,
          cashTendered: amount,
          changeDue: Math.max(0, amount - total),
        },
      };
    }),

  setCardReference: (ref) =>
    set((state) => ({
      payment: { ...state.payment, cardReference: ref },
    })),

  setGiftCardCode: (code) =>
    set((state) => ({
      payment: { ...state.payment, giftCardCode: code },
    })),

  setGiftCardDeduction: (amount) =>
    set((state) => ({
      payment: { ...state.payment, giftCardDeduction: amount },
    })),

  setSplitPayments: (payments) =>
    set((state) => ({
      payment: { ...state.payment, splitPayments: payments },
    })),

  resetPayment: () => set({ payment: { ...defaultPayment } }),

  // ─── Notes ─────────────────────────────────────────────────
  setNotes: (notes) => set({ notes }),

  // ─── UI Actions ────────────────────────────────────────────
  openCheckout: () => set({ isCheckoutOpen: true }),
  closeCheckout: () => set({ isCheckoutOpen: false }),
  openShiftModal: (mode) => set({ isShiftModalOpen: true, shiftModalMode: mode }),
  closeShiftModal: () => set({ isShiftModalOpen: false }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setLastOrderNumber: (orderNumber) => set({ lastOrderNumber: orderNumber }),

  // ─── Computed ──────────────────────────────────────────────
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const giftCardDeduction = get().payment.giftCardDeduction;
    return Math.max(0, subtotal - giftCardDeduction);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getChangeDue: () => {
    const { payment } = get();
    const total = get().getTotal();
    if (payment.method === "POS_CASH") {
      return Math.max(0, payment.cashTendered - total);
    }
    return 0;
  },
}));
