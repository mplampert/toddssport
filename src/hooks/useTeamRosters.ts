import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamRoster {
  id: string;
  store_id: string;
  name: string;
  season: string | null;
  sport: string | null;
  created_at: string;
  updated_at: string;
}

export interface RosterPlayer {
  id: string;
  team_roster_id: string;
  player_first_name: string;
  player_last_name: string;
  jersey_number: string;
  status: "active" | "inactive";
  grad_year: number | null;
  birth_year: number | null;
  position: string | null;
  player_email: string | null;
  player_phone: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  notes: string | null;
  claimed_order_item_id: string | null;
  claimed_at: string | null;
  claimed_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export function useStoreRosters(storeId: string) {
  return useQuery({
    queryKey: ["team-rosters", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_rosters")
        .select("*")
        .eq("store_id", storeId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as TeamRoster[];
    },
    enabled: !!storeId,
  });
}

export function useRosterPlayers(rosterId: string | null) {
  return useQuery({
    queryKey: ["roster-players", rosterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_roster_players")
        .select("*")
        .eq("team_roster_id", rosterId!)
        .order("jersey_number");
      if (error) throw error;
      return (data ?? []) as RosterPlayer[];
    },
    enabled: !!rosterId,
  });
}

export function useCreateRoster(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roster: { name: string; season?: string; sport?: string }) => {
      const { data, error } = await supabase
        .from("team_rosters")
        .insert({ ...roster, store_id: storeId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as TeamRoster;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-rosters", storeId] });
      toast.success("Roster created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamRoster> & { id: string }) => {
      const { error } = await supabase
        .from("team_rosters")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-rosters"] });
      toast.success("Roster updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_rosters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-rosters"] });
      toast.success("Roster deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertPlayer(rosterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (player: Partial<RosterPlayer> & { team_roster_id: string }) => {
      if (player.id) {
        const { id, team_roster_id, created_at, updated_at, ...updates } = player;
        const { error } = await supabase
          .from("team_roster_players")
          .update(updates as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_roster_players")
          .insert(player as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster-players", rosterId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePlayer(rosterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_roster_players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster-players", rosterId] });
      toast.success("Player removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkImportPlayers(rosterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (players: Omit<RosterPlayer, "id" | "created_at" | "updated_at" | "claimed_order_item_id" | "claimed_at" | "claimed_by_email">[]) => {
      const { error } = await supabase
        .from("team_roster_players")
        .insert(players as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roster-players", rosterId] });
      toast.success("Players imported");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
