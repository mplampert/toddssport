import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreOrder {
  id: string;
  store_id: string;
  order_number: string;
  source: "online" | "manual";
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  fulfillment_method: string;
  fulfillment_status: string;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  internal_notes: string | null;
  customer_notes: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  team_store_product_id: string | null;
  product_name_snapshot: string;
  variant_snapshot: any;
  quantity: number;
  unit_price: number;
  line_total: number;
  personalization_name: string | null;
  personalization_number: string | null;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  type: "payment" | "refund" | "adjustment";
  method: string;
  amount: number;
  provider: string | null;
  provider_ref: string | null;
  note: string | null;
  created_at: string;
}

export function computePaymentStatus(payments: OrderPayment[], orderTotal: number) {
  const paid = payments
    .filter((p) => p.type === "payment" || p.type === "adjustment")
    .reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p) => p.type === "refund")
    .reduce((s, p) => s + Number(p.amount), 0);
  const paidTotal = paid - refunded;
  const balanceDue = orderTotal - paidTotal;

  let status: string;
  if (orderTotal <= 0) status = "n/a";
  else if (paidTotal <= 0 && refunded > 0) status = "refunded";
  else if (paidTotal <= 0) status = "unpaid";
  else if (balanceDue > 0.01) status = "partial";
  else if (balanceDue < -0.01) status = "overpaid";
  else status = "paid";

  return { paidTotal, balanceDue, status };
}

export function useStoreOrders(storeId: string) {
  return useQuery({
    queryKey: ["team-store-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreOrder[];
    },
  });
}

export function useStoreOrder(orderId: string) {
  return useQuery({
    queryKey: ["team-store-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data as StoreOrder;
    },
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ["team-store-order-items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
  });
}

export function useOrderPayments(orderId: string) {
  return useQuery({
    queryKey: ["team-store-order-payments", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrderPayment[];
    },
  });
}

export function useCreateOrder(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: Partial<StoreOrder> & { items?: Partial<OrderItem>[] }) => {
      const { items, ...orderData } = order;
      // Generate order number from timestamp
      const orderNumber = `MO-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("team_store_orders")
        .insert({ ...orderData, store_id: storeId, order_number: orderNumber } as any)
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from("team_store_order_items")
          .insert(items.map((i) => ({ ...i, order_id: data.id })) as any);
        if (itemsError) throw itemsError;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-store-orders", storeId] });
      toast.success("Order created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["team-store-order", data.id] });
      qc.invalidateQueries({ queryKey: ["team-store-orders", data.store_id] });
      toast.success("Order updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddOrderItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<OrderItem>) => {
      const { data, error } = await supabase
        .from("team_store_order_items")
        .insert({ ...item, order_id: orderId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-store-order-items", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, order_id, ...updates }: Partial<OrderItem> & { id: string; order_id: string }) => {
      const { error } = await supabase
        .from("team_store_order_items")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return order_id;
    },
    onSuccess: (orderId: string) => {
      qc.invalidateQueries({ queryKey: ["team-store-order-items", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, order_id }: { id: string; order_id: string }) => {
      const { error } = await supabase
        .from("team_store_order_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return order_id;
    },
    onSuccess: (orderId: string) => {
      qc.invalidateQueries({ queryKey: ["team-store-order-items", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Partial<OrderPayment>) => {
      const { data, error } = await supabase
        .from("team_store_payments")
        .insert({ ...payment, order_id: orderId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-store-order-payments", orderId] });
      toast.success("Payment recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
