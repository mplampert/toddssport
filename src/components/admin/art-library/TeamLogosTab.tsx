import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, ExternalLink, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface StoreLogo {
  id: string;
  team_store_id: string;
  name: string;
  file_url: string;
  file_type: string;
  placement: string | null;
  decoration_type: string;
  is_primary: boolean;
  created_at: string;
  store_name?: string;
  store_org?: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
  left_front: "Left Chest",
  right_front: "Right Chest",
  center_front: "Center Front",
  full_front: "Full Front",
  full_back: "Full Back",
  upper_back: "Upper Back",
  left_sleeve: "Left Sleeve",
  right_sleeve: "Right Sleeve",
  hat_front: "Hat Front",
  hat_side: "Hat Side",
  left_leg: "Left Leg",
  right_leg: "Right Leg",
};

const DECO_LABELS: Record<string, string> = {
  screen_print: "Screen Print",
  embroidery: "Embroidery",
  tackle_twill: "Tackle Twill",
  dtf: "DTF",
  heat_press: "Heat Press",
  sublimation: "Sublimation",
  other: "Other",
};

export function TeamLogosTab() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: logos = [], isLoading } = useQuery<StoreLogo[]>({
    queryKey: ["global-team-logos"],
    queryFn: async () => {
      const { data: storeLogos, error } = await supabase
        .from("store_logos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch store names
      const storeIds = [...new Set((storeLogos || []).map((l: any) => l.team_store_id))];
      let storeMap: Record<string, { name: string; organization: string | null }> = {};
      if (storeIds.length > 0) {
        const { data: stores } = await supabase
          .from("team_stores")
          .select("id, name, organization")
          .in("id", storeIds);
        (stores || []).forEach((s: any) => {
          storeMap[s.id] = { name: s.name, organization: s.organization };
        });
      }

      return (storeLogos || []).map((l: any) => ({
        ...l,
        store_name: storeMap[l.team_store_id]?.name ?? "Unknown Store",
        store_org: storeMap[l.team_store_id]?.organization,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_logos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logo deleted");
      queryClient.invalidateQueries({ queryKey: ["global-team-logos"] });
      queryClient.invalidateQueries({ queryKey: ["store-logos"] });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const filtered = search.trim()
    ? logos.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.store_name?.toLowerCase().includes(search.toLowerCase()) ||
          l.store_org?.toLowerCase().includes(search.toLowerCase()),
      )
    : logos;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by logo name or store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} logo{filtered.length !== 1 ? "s" : ""} across all stores
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No logos found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term." : "Logos saved from the builder or uploaded to stores will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((logo) => (
            <Card key={logo.id} className="group relative overflow-hidden">
              <CardContent className="p-3">
                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{logo.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the logo and all its variants. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(logo.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Image */}
                <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center mb-2 overflow-hidden">
                  {logo.file_url ? (
                    <img
                      src={logo.file_url}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain p-2"
                      loading="lazy"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <p className="text-sm font-medium truncate" title={logo.name}>{logo.name}</p>
                <p className="text-[11px] text-muted-foreground truncate" title={logo.store_name}>
                  {logo.store_name}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {logo.placement && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {PLACEMENT_LABELS[logo.placement] ?? logo.placement}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {DECO_LABELS[logo.decoration_type] ?? logo.decoration_type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
