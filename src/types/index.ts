// Giftbox.lk Type Definitions

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

// Occasion Types
export interface Occasion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  color?: string;
  isPopular?: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  discount?: {
    id: string;
    name: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
  };
  images: string[];
  categoryId: string;
  subcategoryId?: string;
  occasionIds: string[];
  tags: string[];
  rating?: number;
  averageRating?: number;
  reviewCount?: number;
  inStock: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isTopRated?: boolean;
  showInDiscountSection?: boolean; showInChocolateSection?: boolean; showInSoftToysSection?: boolean;
  recipientIds?: string[];
  variants?: ProductVariant[];
  sizes?: string[];
  colors?: string[];
  productVariants?: any[];
  isPremiumGiftBox?: boolean;
  isEGiftCard?: boolean;
  giftCardValue?: number;
  itemsInside?: Array<{
    quantity: number;
    item: { stock: number };
  }>;
  capacityUnits?: number; // For box builder
  addOnCategory?: AddOnCategory;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
}

export type AddOnCategory = 'chocolate' | 'flower' | 'card' | 'teddy' | 'addon';

// Gift Box Types (Ready-made)
export interface GiftBox extends Product {
  boxType: 'readymade';
  contents: GiftBoxContent[];
  wrappingStyle?: string;
}

export interface GiftBoxContent {
  productId: string;
  productName: string;
  quantity: number;
}

// Build Your Own Box Types
export interface BoxType {
  id: string;
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
  image: string;
}

export interface BoxBuilderItem extends Product {
  capacityUnits: number;
  category: string;
  occasions: string[];
  recipients: string[];
}

export interface WrappingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  imageUrl?: string;
}

export interface NoteStyle {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

// Custom Box (for builder)
export interface CustomBox {
  boxType: BoxType;
  items: CustomBoxItem[];
  message?: string;
  wrapping?: WrappingOption;
  noteStyle?: NoteStyle;
}

export interface CustomBoxItem {
  item: BoxBuilderItem;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  variantName?: string;
}

// Cart Types
export interface CartItem {
  id: string;
  type: 'product' | 'giftbox' | 'custombox' | 'giftcard';
  product?: Product;
  giftBox?: GiftBox;
  customBox?: CustomBox;
  virtualGiftCard?: {
    initialValue: number;
    currency: string;
  };
  quantity: number;
  selectedVariant?: ProductVariant;
  variantName?: string;
  price?: number; // to store the purchase price of the item
  originalPrice?: number; // to store the pre-discount price of the item
  subtotal: number;
  isOutOfStock?: boolean;
  isDigital?: boolean;
  isCustomBox?: boolean;
  customBoxConfig?: any;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// Checkout Types
export interface DeliveryInfo {
  recipientName: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  postalCode?: string;
  deliveryDate: string;
  deliveryTime?: string;
  deliveryNotes?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface CheckoutData {
  deliveryInfo: DeliveryInfo;
  paymentMethod: string;
  isGift: boolean;
  includeMessageCard: boolean;
  messageCardText?: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  deliveryInfo: DeliveryInfo;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
}

// Filter Types
export interface ProductFilters {
  category?: string;
  subcategory?: string;
  occasion?: string;
  priceRange?: [number, number];
  sortBy?: 'price-asc' | 'price-desc' | 'name' | 'rating' | 'newest';
  inStock?: boolean;
}

// Section Types for Homepage
export interface HomeSection {
  id: string;
  type: 'hero' | 'categories' | 'occasions' | 'featured' | 'bestsellers' | 'addons' | 'promotional' | 'trust';
  title?: string;
  subtitle?: string;
  data: unknown;
}
