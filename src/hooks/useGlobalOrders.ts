import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  store_id: string;
  store_name?: string;
}

export function useGlobalOrders() {
  return useQuery({
    queryKey: ["global-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, order_number, customer_name, customer_email, total, status, payment_status, created_at, store_id, team_stores!inner(name)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        ...o,
        store_name: o.team_stores?.name ?? "Unknown",
        team_stores: undefined,
      })) as GlobalOrder[];
    },
  });
}
