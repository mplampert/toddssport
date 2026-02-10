import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  status: string;
  payment_status: string;
  fulfillment_method: string;
  fulfillment_status: string;
  pickup_location_id: string | null;
  shipping_state: string | null;
  shipping_city: string | null;
  created_at: string;
  internal_notes: string | null;
}

export interface StoreOrderItem {
  id: string;
  order_id: string;
  product_name_snapshot: string;
  store_display_name: string | null;
  catalog_product_name: string | null;
  catalog_sku: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  variant_snapshot: any;
  personalization_name: string | null;
  personalization_number: string | null;
  team_roster_player_id: string | null;
  decoration_snapshot: any;
  pricing_snapshot: any;
  team_store_product_id: string | null;
}

export function useStoreReportData(storeId: string) {
  const ordersQuery = useQuery({
    queryKey: ["store-report-orders", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select(
          "id, order_number, customer_name, customer_email, total, subtotal, tax_total, shipping_total, discount_total, status, payment_status, fulfillment_method, fulfillment_status, pickup_location_id, shipping_state, shipping_city, created_at, internal_notes"
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      return (data ?? []) as StoreOrder[];
    },
  });

  const orders = ordersQuery.data ?? [];
  const orderIds = orders.map((o) => o.id);

  const itemsQuery = useQuery({
    queryKey: ["store-report-items", storeId, orderIds.length],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      // Supabase has a 1000 row limit, so batch if needed
      const all: StoreOrderItem[] = [];
      for (let i = 0; i < orderIds.length; i += 500) {
        const batch = orderIds.slice(i, i + 500);
        const { data } = await supabase
          .from("team_store_order_items")
          .select(
            "id, order_id, product_name_snapshot, store_display_name, catalog_product_name, catalog_sku, quantity, unit_price, line_total, variant_snapshot, personalization_name, personalization_number, team_roster_player_id, decoration_snapshot, pricing_snapshot, team_store_product_id"
          )
          .in("order_id", batch);
        if (data) all.push(...(data as StoreOrderItem[]));
      }
      return all;
    },
    enabled: orderIds.length > 0,
  });

  return {
    orders,
    items: itemsQuery.data ?? [],
    isLoading: ordersQuery.isLoading || itemsQuery.isLoading,
  };
}

// CSV download helper
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Get display name for an item
export function itemDisplayName(item: StoreOrderItem) {
  return item.store_display_name || item.product_name_snapshot || "Unknown";
}

// Get size from variant_snapshot
export function itemSize(item: StoreOrderItem): string {
  if (!item.variant_snapshot) return "—";
  const v = typeof item.variant_snapshot === "string" ? JSON.parse(item.variant_snapshot) : item.variant_snapshot;
  return v.sizeName || v.size_name || v.size || "—";
}

// Get color from variant_snapshot
export function itemColor(item: StoreOrderItem): string {
  if (!item.variant_snapshot) return "—";
  const v = typeof item.variant_snapshot === "string" ? JSON.parse(item.variant_snapshot) : item.variant_snapshot;
  return v.colorName || v.color_name || v.color || "—";
}

// Get decoration type
export function itemDecorationType(item: StoreOrderItem): string {
  if (!item.decoration_snapshot) return "None";
  const d = typeof item.decoration_snapshot === "string" ? JSON.parse(item.decoration_snapshot) : item.decoration_snapshot;
  if (Array.isArray(d) && d.length > 0) {
    return d.map((dec: any) => dec.method || dec.type || "Unknown").join(", ");
  }
  return d.method || d.type || "None";
}
