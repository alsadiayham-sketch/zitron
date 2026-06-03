"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/lib/types";
import { getComboOfferIdFromItemId, isComboCartItemId } from "@/lib/offers";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  replaceComboItems: (offerId: string, newItems: Omit<CartItem, "quantity">[]) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function mergeCartItems(
  currentItems: CartItem[],
  newItems: Array<Omit<CartItem, "quantity"> | CartItem>
) {
  const nextItems = [...currentItems];

  for (const item of newItems) {
    const quantity = "quantity" in item ? item.quantity : 1;
    const existingIndex = nextItems.findIndex((currentItem) => currentItem.id === item.id);

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        quantity: nextItems[existingIndex].quantity + quantity,
      };
      continue;
    }

    nextItems.push({ ...item, quantity });
  }

  return nextItems;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem("zitron-cart");
    if (!saved) return [];

    try {
      return JSON.parse(saved) as CartItem[];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("zitron-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => mergeCartItems(prev, [item]));
  };

  const replaceComboItems = (offerId: string, newItems: Omit<CartItem, "quantity">[]) => {
    setItems((prev) => {
      const filteredItems = prev.filter((item) => {
        if (!isComboCartItemId(item.id)) {
          return true;
        }

        return getComboOfferIdFromItemId(item.id) !== offerId;
      });

      return mergeCartItems(filteredItems, newItems);
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setIsCartOpen(false);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        replaceComboItems,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
