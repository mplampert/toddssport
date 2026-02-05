import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCartSessionId } from "@/lib/cartSession";
import type { LeadTimeType } from "@/lib/champroPricing";

export interface CartItem {
  id: string;
  session_id: string;
  user_id: string | null;
  champro_session_id: string;
  sport_slug: string;
  sport_title: string | null;
  quantity: number;
  lead_time: LeadTimeType;
  team_name: string | null;
  category: string | null;
  product_master: string | null;
  unit_price: number | null;
  team_store_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sessionId = getCartSessionId();
      
      // Fetch by session_id or user_id
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      let query = supabase
        .from("cart_items")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (userId) {
        // Logged in user: fetch by user_id OR session_id
        query = query.or(`session_id.eq.${sessionId},user_id.eq.${userId}`);
      } else {
        // Anonymous: fetch by session_id only
        query = query.eq("session_id", sessionId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        console.error("Error fetching cart:", fetchError);
        setError(fetchError.message);
        return;
      }
      
      setItems((data as CartItem[]) || []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);
      
      if (error) {
        console.error("Error removing item:", error);
        return false;
      }
      
      setItems(prev => prev.filter(item => item.id !== itemId));
      return true;
    } catch (err) {
      console.error("Failed to remove item:", err);
      return false;
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);
      
      if (error) {
        console.error("Error updating quantity:", error);
        return false;
      }
      
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        )
      );
      return true;
    } catch (err) {
      console.error("Failed to update quantity:", err);
      return false;
    }
  }, []);

  const clearCart = useCallback(async () => {
    const sessionId = getCartSessionId();
    
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("session_id", sessionId);
      
      if (error) {
        console.error("Error clearing cart:", error);
        return false;
      }
      
      setItems([]);
      return true;
    } catch (err) {
      console.error("Failed to clear cart:", err);
      return false;
    }
  }, []);

  const itemCount = items.length;
  
  const subtotal = items.reduce((sum, item) => {
    const price = item.unit_price || 0;
    return sum + (price * item.quantity);
  }, 0);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    items,
    loading,
    error,
    itemCount,
    subtotal,
    fetchCart,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
