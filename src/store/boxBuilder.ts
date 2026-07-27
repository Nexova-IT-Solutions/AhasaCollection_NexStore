import { create } from "zustand";
import { persist } from "zustand/middleware";
import { 
  BoxType, 
  BoxBuilderItem, 
  WrappingOption, 
  CustomBoxItem,
  Product as GeneralProduct
} from "@/types";

// The Product type from our new BYOB flow
export interface BYOBProduct {
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
  variantName?: string;
}

interface BoxBuilderState {
  // Current state
  currentStep: number;
  selectedBox: BoxType | null;
  addedItems: AddedItem[];
  message: string;
  selectedWrapping: WrappingOption | null;
  
  // New BYOB flow helper fields
  currentCapacity: number;
  maxCapacity: number;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  selectBox: (box: BoxType) => void;
  addItem: (product: any, selectedSize?: string, selectedColor?: string) => void;
  removeItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  incrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  decrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  updateItemQuantity: (id: string, qty: number, selectedSize?: string, selectedColor?: string) => void;
  setMessage: (message: string) => void;
  selectWrapping: (wrapping: WrappingOption | null) => void;
  reset: () => void;
  
  // Computed / Helpers
  getItemQuantity: (productId: string, selectedSize?: string, selectedColor?: string) => number;
  getUsedCapacity: () => number;
  getRemainingCapacity: () => number;
  getTotal: () => number;
  canAddItem: (item: any) => boolean;
}

const defaultBox: BoxType = {
  id: "standard-custom-box",
  name: "Premium Gift Box",
  description: "Our signature luxury gift box",
  capacity: 100, // Effectively unlimited as requested
  basePrice: 0,  // Free as requested
  image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
};

export const useBoxBuilderStore = create<BoxBuilderState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      selectedBox: defaultBox,
      addedItems: [],
      message: "",
      selectedWrapping: null,
      currentCapacity: 0,
      maxCapacity: 100,

      setStep: (step: number) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      selectBox: (box: BoxType) => set({ selectedBox: box }),

      addItem: (product: any, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        const productId = product.id;
        const existingItem = addedItems.find(
          (p) => p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
        );

        if (existingItem) {
          set({
            addedItems: addedItems.map((p) =>
              p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
                ? { ...p, quantity: p.quantity + 1 }
                : p
            ),
          });
        } else {
          // Handle both BYOBProduct and BoxBuilderItem
          const imageUrl = product.image || (Array.isArray(product.images) ? product.images[0] : "");
          const variantName = (selectedSize || selectedColor)
            ? `${selectedSize || ''} ${selectedColor ? `/ ${selectedColor.split('|')[0]}` : ''}`.trim()
            : undefined;
          
          set({
            addedItems: [
              ...addedItems,
              {
                productId: productId,
                quantity: 1,
                price: product.price,
                name: product.name,
                image: imageUrl,
                selectedSize,
                selectedColor,
                variantName,
              },
            ],
          });
        }
      },

      removeItem: (productId: string, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        set({
          addedItems: addedItems.filter(
            (p) => !(p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor)
          ),
        });
      },

      incrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        set({
          addedItems: addedItems.map((p) =>
            p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
              ? { ...p, quantity: p.quantity + 1 }
              : p
          ),
        });
      },

      decrementItem: (productId: string, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        const item = addedItems.find(
          (p) => p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
        );
        
        if (!item) return;

        if (item.quantity <= 1) {
          get().removeItem(productId, selectedSize, selectedColor);
          return;
        }

        set({
          addedItems: addedItems.map((p) =>
            p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
              ? { ...p, quantity: p.quantity - 1 }
              : p
          ),
        });
      },

      updateItemQuantity: (id: string, qty: number, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        if (qty <= 0) {
          get().removeItem(id, selectedSize, selectedColor);
          return;
        }
        set({
          addedItems: addedItems.map((p) =>
            p.productId === id && p.selectedSize === selectedSize && p.selectedColor === selectedColor
              ? { ...p, quantity: qty }
              : p
          ),
        });
      },

      setMessage: (message: string) => set({ message }),

      selectWrapping: (wrapping: WrappingOption | null) => set({ selectedWrapping: wrapping }),

      reset: () => set({
        currentStep: 1,
        selectedBox: defaultBox,
        addedItems: [],
        message: "",
        selectedWrapping: null,
        currentCapacity: 0,
      }),

      getItemQuantity: (productId: string, selectedSize?: string, selectedColor?: string) => {
        const { addedItems } = get();
        const item = addedItems.find(
          (p) => p.productId === productId && p.selectedSize === selectedSize && p.selectedColor === selectedColor
        );
        return item ? item.quantity : 0;
      },

      getUsedCapacity: () => get().addedItems.reduce((sum, i) => sum + i.quantity, 0),
      getRemainingCapacity: () => (get().selectedBox?.capacity || 100) - get().getUsedCapacity(),
      getTotal: () => {
        const { addedItems, selectedWrapping } = get();
        const itemsTotal = addedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const wrappingPrice = selectedWrapping?.price || 0;
        return itemsTotal + wrappingPrice;
      },
      canAddItem: (item: any) => {
        return get().getRemainingCapacity() >= (item.builderCapacityUnits || item.capacityUnits || 1);
      }
    }),
    {
      name: "giftboxlk-byob-store",
      skipHydration: true,
    }
  )
);
