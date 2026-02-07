import { useOutletContext } from "react-router-dom";

export interface TeamStoreContext {
  store: {
    id: string;
    name: string;
    slug: string;
    start_date: string | null;
    end_date: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    active: boolean;
    status: string | null;
    store_pin: string | null;
    fundraising_goal_amount: number | null;
    fundraising_goal: number | null;
    fundraising_percent: number | null;
    description: string | null;
    hero_title: string | null;
    hero_subtitle: string | null;
    store_type: string | null;
    created_at: string;
    updated_at: string;
  };
}

export function useTeamStoreContext() {
  return useOutletContext<TeamStoreContext>();
}
