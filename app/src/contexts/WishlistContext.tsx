import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  slug?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  totalItems: number;
  addItem: (item: Omit<WishlistItem, 'id'>) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  hasItem: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'tafchaa-wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(WISHLIST_STORAGE_KEY) : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch {
      void 0;
    }
  }, [items]);

  const addItem = (newItem: Omit<WishlistItem, 'id'>) => {
    setItems(prev => {
      const exists = prev.some(i => i.productId === newItem.productId);
      if (exists) return prev;
      return [...prev, { ...newItem, id: `${newItem.productId}-${Date.now()}` }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const clear = () => setItems([]);

  const hasItem = (productId: string) => items.some(i => i.productId === productId);

  const totalItems = items.length;

  const value: WishlistContextType = {
    items,
    totalItems,
    addItem,
    removeItem,
    clear,
    hasItem,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
