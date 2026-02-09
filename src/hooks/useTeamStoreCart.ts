import { useState, useCallback, useEffect } from "react";

export interface TeamStoreCartItem {
  id: string; // unique cart line id
  storeId: string;
  storeSlug: string;
  storeName: string;
  productId: string; // team_store_products.id
  styleId: number;
  productName: string;
  brandName: string;
  color: string;
  colorCode: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number; // base + decoration + personalization
  basePrice: number;
  decoUpcharge: number;
  persUpcharge: number;
  imageUrl: string | null;
  personalization?: {
    name?: string;
    number?: string;
    namePrice: number;
    numberPrice: number;
    customFields?: Record<string, string>; // fieldId -> value
    customFieldsUpcharge?: number;
  };
  addedAt: string;
}

const STORAGE_KEY = "ts_cart";

function loadCart(): TeamStoreCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: TeamStoreCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let listeners: Array<() => void> = [];
function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function useTeamStoreCart() {
  const [items, setItems] = useState<TeamStoreCartItem[]>(loadCart);

  // Subscribe to cross-component updates
  useEffect(() => {
    const handler = () => setItems(loadCart());
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const addItem = useCallback((item: Omit<TeamStoreCartItem, "id" | "addedAt">) => {
    setItems((prev) => {
      // Check for duplicate (same product + color + size + personalization)
      const existing = prev.find(
        (i) =>
          i.productId === item.productId &&
          i.color === item.color &&
          i.size === item.size &&
          i.personalization?.name === item.personalization?.name &&
          i.personalization?.number === item.personalization?.number
      );
      let next: TeamStoreCartItem[];
      if (existing) {
        next = prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        const newItem: TeamStoreCartItem = {
          ...item,
          id: crypto.randomUUID(),
          addedAt: new Date().toISOString(),
        };
        next = [...prev, newItem];
      }
      saveCart(next);
      notifyListeners();
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveCart(next);
      notifyListeners();
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i));
      saveCart(next);
      notifyListeners();
      return next;
    });
  }, []);

  const clearStore = useCallback((storeId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.storeId !== storeId);
      saveCart(next);
      notifyListeners();
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveCart([]);
    setItems([]);
    notifyListeners();
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const itemsForStore = useCallback(
    (storeId: string) => items.filter((i) => i.storeId === storeId),
    [items]
  );

  return {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearStore,
    clearAll,
    itemsForStore,
  };
}
