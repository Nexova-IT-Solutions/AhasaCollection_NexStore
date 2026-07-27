export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  builderCapacityUnits: number;
  occasions: string[];
  isActive: boolean;
}

export interface AddedItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface BoxBuilderStore {
  currentCapacity: number;
  maxCapacity: number;
  addedItems: AddedItem[];
  addItem: (product: Product, selectedSize?: string, selectedColor?: string) => void;
  removeItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  incrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  decrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  getItemQuantity: (productId: string, selectedSize?: string, selectedColor?: string) => number;
}
