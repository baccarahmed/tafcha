import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SneakerPalette } from '@/types/product';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  palette: SneakerPalette;
  slug: string;
  /** Image produit issue de la base ; absente sur les favoris enregistres avant
   *  l'ajout de ce champ, d'ou le repli sur `SneakerVisual` a l'affichage. */
  image?: string;
}

interface WishlistState {
  items: WishlistItem[];
}

interface WishlistActions {
  toggleItem: (item: Omit<WishlistItem, 'id'>) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
  hasItem: (productId: string) => boolean;
}

export type WishlistStore = WishlistState & WishlistActions;

const useWishlistStoreBase = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (item) => {
        set((state) => {
          const exists = state.items.some((i) => i.productId === item.productId);
          if (exists) {
            return {
              items: state.items.filter((i) => i.productId !== item.productId),
            };
          }
          const id = `${item.productId}-${Date.now()}`;
          return {
            items: [...state.items, { ...item, id }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      hasItem: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },
    }),
    {
      name: 'q2m-wishlist',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export const useWishlistStore = useWishlistStoreBase;

export const toggleItem = (item: Omit<WishlistItem, 'id'>) =>
  useWishlistStoreBase.getState().toggleItem(item);
export const removeItem = (productId: string) =>
  useWishlistStoreBase.getState().removeItem(productId);
export const clearWishlist = () => useWishlistStoreBase.getState().clearWishlist();
export const hasItem = (productId: string) => useWishlistStoreBase.getState().hasItem(productId);

export default useWishlistStore;
