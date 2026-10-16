import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SneakerPalette } from '@/types/product';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  palette: SneakerPalette;
  slug: string;
  size?: string;
  /** URL de la photo produit affichée au moment de l'ajout (repli `SneakerVisual`). */
  image?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
}

interface CartActions {
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export type CartStore = CartState & CartActions;

const calculateTotals = (items: CartItem[]): { totalItems: number; totalPrice: number } => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { totalItems, totalPrice };
};

const useCartStoreBase = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      totalItems: 0,
      totalPrice: 0,

      addItem: (newItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.productId === newItem.productId && item.size === newItem.size
          );

          let updatedItems: CartItem[];

          if (existingIndex >= 0) {
            updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + newItem.quantity,
            };
          } else {
            const id = `${newItem.productId}-${newItem.size ?? 'default'}-${Date.now()}`;
            updatedItems = [...state.items, { ...newItem, id }];
          }

          return {
            items: updatedItems,
            isOpen: true,
            ...calculateTotals(updatedItems),
          };
        });
      },

      removeItem: (productId, size) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) =>
              !(item.productId === productId && item.size === size)
          );
          return {
            items: updatedItems,
            ...calculateTotals(updatedItems),
          };
        });
      },

      updateQuantity: (productId, quantity, size) => {
        if (quantity <= 0) {
          get().removeItem(productId, size);
          return;
        }

        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.productId === productId && item.size === size
              ? { ...item, quantity }
              : item
          );
          return {
            items: updatedItems,
            ...calculateTotals(updatedItems),
          };
        });
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'q2m-cart',
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CartState> | undefined;
        const items = Array.isArray(persisted?.items) ? persisted.items : currentState.items;
        return { ...currentState, ...persisted, items, ...calculateTotals(items) };
      },
    }
  )
);

export const useCartStore = useCartStoreBase;

export const addItem = (item: Omit<CartItem, 'id'>) => useCartStoreBase.getState().addItem(item);
export const removeItem = (productId: string, size?: string) =>
  useCartStoreBase.getState().removeItem(productId, size);
export const updateQuantity = (productId: string, quantity: number, size?: string) =>
  useCartStoreBase.getState().updateQuantity(productId, quantity, size);
export const clearCart = () => useCartStoreBase.getState().clearCart();
export const openCart = () => useCartStoreBase.getState().openCart();
export const closeCart = () => useCartStoreBase.getState().closeCart();
export const toggleCart = () => useCartStoreBase.getState().toggleCart();

export default useCartStore;
