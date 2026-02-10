import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FulfillmentBatch {
  id: string;
  team_store_id: string;
  created_at: string;
  updated_at: string;
  cutoff_datetime: string;
  status: "draft" | "ready" | "in_production" | "shipped" | "complete";
  order_ids: string[];
  notes: string | null;
  // joined
  store_name?: string;
}

const BATCH_STATUSES = ["draft", "ready", "in_production", "shipped", "complete"] as const;
export { BATCH_STATUSES };

export function useStoreBatches(storeId: string) {
  return useQuery({
    queryKey: ["fulfillment-batches", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fulfillment_batches")
        .select("*")
        .eq("team_store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FulfillmentBatch[];
    },
  });
}

export function useGlobalBatches() {
  return useQuery({
    queryKey: ["fulfillment-batches-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fulfillment_batches")
        .select("*, team_stores!inner(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        ...b,
        store_name: b.team_stores?.name ?? "Unknown",
        team_stores: undefined,
      })) as FulfillmentBatch[];
    },
  });
}

export function useBatchDetail(batchId: string | undefined) {
  return useQuery({
    queryKey: ["fulfillment-batch", batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fulfillment_batches")
        .select("*, team_stores!inner(name, slug)")
        .eq("id", batchId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        store_name: (data as any).team_stores?.name ?? "Unknown",
        store_slug: (data as any).team_stores?.slug ?? "",
      } as FulfillmentBatch & { store_name: string; store_slug: string };
    },
    enabled: !!batchId,
  });
}

export function useCreateBatch(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { data, error } = await supabase
        .from("fulfillment_batches")
        .insert({
          team_store_id: storeId,
          cutoff_datetime: new Date().toISOString(),
          order_ids: orderIds,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulfillment-batches", storeId] });
      queryClient.invalidateQueries({ queryKey: ["fulfillment-batches-global"] });
      toast.success("Batch created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      const { error } = await supabase
        .from("fulfillment_batches")
        .update({ status })
        .eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulfillment-batches"] });
      queryClient.invalidateQueries({ queryKey: ["fulfillment-batches-global"] });
      queryClient.invalidateQueries({ queryKey: ["fulfillment-batch"] });
      toast.success("Batch status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
