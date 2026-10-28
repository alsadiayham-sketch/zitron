"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/lib/types";
import { getComboOfferIdFromItemId, isComboCartItemId } from "@/lib/offers";

export const CART_STORAGE_KEY = "zitron-cart";
const MAX_CART_QUANTITY = 99;

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  refreshItem: (id: string, item: Omit<CartItem, "id" | "quantity">) => void;
  replaceComboItems: (offerId: string, newItems: Array<Omit<CartItem, "quantity"> | CartItem>) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeQuantity(value: unknown) {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(quantity, MAX_CART_QUANTITY);
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<CartItem>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const price = Number(item.price);
  const quantity = normalizeQuantity(item.quantity);

  if (!id || !name || !Number.isFinite(price) || price < 0 || quantity === 0) {
    return null;
  }

  return {
    id,
    name,
    price,
    quantity,
    image: typeof item.image === "string" ? item.image : "",
    range: typeof item.range === "string" ? item.range : "",
  };
}

export function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return mergeCartItems([], parsed.map(normalizeCartItem).filter((item): item is CartItem => Boolean(item)));
  } catch {
    return [];
  }
}

export function mergeCartItems(
  currentItems: CartItem[],
  newItems: Array<Omit<CartItem, "quantity"> | CartItem>
) {
  const nextItems = [...currentItems];

  for (const item of newItems) {
    const normalized = normalizeCartItem({
      ...item,
      quantity: "quantity" in item ? item.quantity : 1,
    });
    if (!normalized) continue;

    const quantity = normalized.quantity;
    const existingIndex = nextItems.findIndex((currentItem) => currentItem.id === item.id);

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        ...normalized,
        quantity: Math.min(nextItems[existingIndex].quantity + quantity, MAX_CART_QUANTITY),
      };
      continue;
    }

    nextItems.push(normalized);
  }

  return nextItems;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep the in-memory cart usable when storage is unavailable or full.
    }
  }, [hydrated, items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => mergeCartItems(prev, [item]));
  }, []);

  const replaceComboItems = useCallback((offerId: string, newItems: Array<Omit<CartItem, "quantity"> | CartItem>) => {
    setItems((prev) => {
      const filteredItems = prev.filter((item) => {
        if (!isComboCartItemId(item.id)) {
          return true;
        }

        return getComboOfferIdFromItemId(item.id) !== offerId;
      });

      return mergeCartItems(filteredItems, newItems);
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const normalizedQuantity = normalizeQuantity(quantity);
    if (normalizedQuantity === 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: normalizedQuantity } : i))
    );
  }, [removeItem]);

  const refreshItem = useCallback((id: string, item: Omit<CartItem, "id" | "quantity">) => {
    const normalized = normalizeCartItem({ id, ...item, quantity: 1 });
    if (!normalized) return;

    setItems((prev) =>
      prev.map((current) =>
        current.id === id
          ? { ...normalized, quantity: current.quantity }
          : current
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setIsCartOpen(false);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

  const value = useMemo<CartContextType>(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    refreshItem,
    replaceComboItems,
    clearCart,
    totalItems,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
  }), [addItem, clearCart, isCartOpen, items, refreshItem, removeItem, replaceComboItems, totalItems, totalPrice, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
