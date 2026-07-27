// ─── POS Type Definitions ───────────────────────────────────

export interface PosCartItem {
  id: string;
  productId: string;
  name: string;
  nameAr?: string | null;
  sku: string | null;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  quantity: number;
  subtotal: number;
  image: string | null;
  stock: number;
  discountPercent: number;
  manualDiscount: number;
  discountId?: string | null;
  discountName?: string | null;
  discountType?: "PERCENTAGE" | "FIXED" | null;
  discountValue?: number | null;
  // Gift card issuance fields
  isGiftCard: boolean;
  isPhysical?: boolean;
  giftCardValue: number | null;
  giftCardCode?: string;
  recipientEmail?: string | null;
  personalMessage?: string | null;
}

export interface PosCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  outstandingBalance?: number;
}

export interface PosShiftData {
  id: string;
  operatorId: string;
  operatorName: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  expectedCash: number;
  actualCash: number | null;
  expectedCredit: number;
  actualCredit: number | null;
  cashVariance: number | null;
  creditVariance: number | null;
  expectedDebit?: number;
  actualDebit?: number | null;
  debitVariance?: number | null;
  status: "OPEN" | "CLOSED";
  notes: string | null;
  totalOrders: number;
  totalSales: number;
}

export interface DenominationCount {
  value: number;
  label: string;
  type: "NOTE" | "COIN";
  count: number;
}

export interface CurrencyDenominationData {
  id: string;
  value: number;
  label: string;
  type: "NOTE" | "COIN";
  isActive: boolean;
  sortOrder: number;
}

export type PosPaymentMethod = "POS_CASH" | "POS_CARD" | "POS_GIFT_CARD" | "POS_SPLIT" | "CREDIT_CARD" | "DEBIT_CARD" | "POS_MOBILE_TRANSFER" | "POS_CREDIT";

export interface PosPayment {
  method: PosPaymentMethod;
  cashTendered: number;
  changeDue: number;
  cardReference: string;
  giftCardCode: string;
  giftCardDeduction: number;
  splitPayments: SplitPaymentEntry[];
}

export interface SplitPaymentEntry {
  method: "POS_CASH" | "POS_CARD" | "POS_GIFT_CARD" | "CREDIT_CARD" | "DEBIT_CARD" | "POS_MOBILE_TRANSFER" | "POS_CREDIT";
  amount: number;
  reference: string;
}

/**
 * One activation entry per gift card item in the cart.
 * The operator scans or types the physical gift card code/barcode
 * that should be activated with the sold denomination value.
 */
export interface GiftCardActivation {
  /** productId of the gift card product in the cart */
  productId: string;
  /** The physical barcode or alphanumeric code on the card to activate */
  code: string;
  /** Activation value = effectivePrice of the cart item */
  value: number;
}

export interface PosCheckoutPayload {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    salePrice: number | null;
    discountName: string | null;
    discountValue: number | null;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  cashTendered: number;
  changeDue: number;
  cardReference: string;
  giftCardCode: string;
  giftCardDeduction: number;
  splitPayments: SplitPaymentEntry[];
  shiftId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  notes: string;
  /** Gift card activation entries — one per gift card item sold at POS */
  giftCardActivations: GiftCardActivation[];
}

export interface ScannedProduct {
  id: string;
  name: string;
  nameAr?: string | null;
  sku: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  image: string | null;
  isActive: boolean;
  categoryName: string | null;
  discountId: string | null;
  discountName: string | null;
  discountValue: number | null;
  discountType: string | null;
  isEGiftCard: boolean;
  giftCardValue: number | null;
}

// Default LKR currency denominations
export const LKR_DENOMINATIONS: Omit<DenominationCount, "count">[] = [
  { value: 5000, label: "Rs.5000", type: "NOTE" },
  { value: 2000, label: "Rs.2000", type: "NOTE" },
  { value: 1000, label: "Rs.1000", type: "NOTE" },
  { value: 500, label: "Rs.500", type: "NOTE" },
  { value: 100, label: "Rs.100", type: "NOTE" },
  { value: 50, label: "Rs.50", type: "NOTE" },
  { value: 20, label: "Rs.20", type: "NOTE" },
  { value: 10, label: "Rs.10", type: "COIN" },
  { value: 5, label: "Rs.5", type: "COIN" },
  { value: 2, label: "Rs.2", type: "COIN" },
  { value: 1, label: "Rs.1", type: "COIN" },
];
