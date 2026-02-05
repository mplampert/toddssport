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
    store_pin: string | null;
    created_at: string;
    updated_at: string;
  };
}

export function useTeamStoreContext() {
  return useOutletContext<TeamStoreContext>();
}
