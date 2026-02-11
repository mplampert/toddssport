import { useState, useCallback, useEffect } from "react";

export interface InquiryItem {
  productId: string;
  name: string;
  brand: string;
  sourceSku: string | null;
  color: string | null;
  imageUrl: string | null;
  productUrl: string;
  quantity: number;
}

const STORAGE_KEY = "inquiry-cart";

function loadItems(): InquiryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: InquiryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Global listeners for cross-component reactivity
const listeners = new Set<() => void>();
function notifyAll() {
  listeners.forEach((fn) => fn());
}

export function useInquiryCart() {
  const [items, setItems] = useState<InquiryItem[]>(loadItems);

  useEffect(() => {
    const sync = () => setItems(loadItems());
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);

  const addItem = useCallback((item: Omit<InquiryItem, "quantity">) => {
    const current = loadItems();
    const existing = current.find((i) => i.productId === item.productId);
    let updated: InquiryItem[];
    if (existing) {
      existing.quantity += 1;
      // Update color if changed
      if (item.color) existing.color = item.color;
      updated = [...current];
    } else {
      updated = [...current, { ...item, quantity: 1 }];
    }
    saveItems(updated);
    setItems(updated);
    notifyAll();
  }, []);

  const removeItem = useCallback((productId: string) => {
    const updated = loadItems().filter((i) => i.productId !== productId);
    saveItems(updated);
    setItems(updated);
    notifyAll();
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const current = loadItems();
    const item = current.find((i) => i.productId === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      saveItems(current);
      setItems([...current]);
      notifyAll();
    }
  }, []);

  const clearCart = useCallback(() => {
    saveItems([]);
    setItems([]);
    notifyAll();
  }, []);

  const isInCart = useCallback((productId: string) => {
    return items.some((i) => i.productId === productId);
  }, [items]);

  return { items, addItem, removeItem, updateQuantity, clearCart, isInCart, count: items.length };
}
