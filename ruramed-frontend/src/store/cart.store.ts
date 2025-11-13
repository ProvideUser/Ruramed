import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  medicineId: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  requires_prescription: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (medicineId: number) => void;
  updateQuantity: (medicineId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existingItem = get().items.find((i) => i.medicineId === item.medicineId);
        
        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.medicineId === item.medicineId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            items: [...get().items, { ...item, quantity: 1 }],
          });
        }
      },

      removeItem: (medicineId) => {
        set({
          items: get().items.filter((i) => i.medicineId !== medicineId),
        });
      },

      updateQuantity: (medicineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(medicineId);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.medicineId === medicineId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
