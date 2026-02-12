import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Star, Tag, X, Plus } from "lucide-react";
import { toast } from "sonner";

const SEASON_OPTIONS = ["spring", "summer", "fall", "winter"];
const OCCASION_OPTIONS = [
  "tryouts",
  "playoffs",
  "tournaments",
  "fundraisers",
  "holiday",
  "back-to-school",
  "spirit-wear",
  "corporate",
];

interface ProductFeaturedTagsPanelProps {
  productId: string;
  isFeatured: boolean;
  popularityScore: number;
  seasons: string[];
  occasions: string[];
}

export function ProductFeaturedTagsPanel({
  productId,
  isFeatured,
  popularityScore,
  seasons,
  occasions,
}: ProductFeaturedTagsPanelProps) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(String(popularityScore));

  const updateField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase
        .from("master_products")
        .update(fields)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-product", productId] });
      toast.success("Product updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const toggleSeason = (season: string) => {
    const next = seasons.includes(season)
      ? seasons.filter((s) => s !== season)
      : [...seasons, season];
    updateField.mutate({ seasons: next });
  };

  const toggleOccasion = (occasion: string) => {
    const next = occasions.includes(occasion)
      ? occasions.filter((o) => o !== occasion)
      : [...occasions, occasion];
    updateField.mutate({ occasions: next });
  };

  const handleScoreSave = () => {
    const parsed = parseInt(score, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid number (0+)");
      return;
    }
    updateField.mutate({ popularity_score: parsed });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-accent" />
        <h4 className="text-sm font-semibold text-foreground">Featured & Tags</h4>
      </div>

      {/* Featured toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isFeatured}
          onCheckedChange={(v) => updateField.mutate({ is_featured: v })}
          className="scale-90"
        />
        <span className="text-sm text-foreground">
          {isFeatured ? "Featured product ✓" : "Not featured"}
        </span>
      </div>

      {/* Popularity score */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-32">Popularity Score</span>
        <Input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="h-8 w-20 text-sm"
          type="number"
          min={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleScoreSave();
          }}
        />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleScoreSave}>
          Save
        </Button>
      </div>

      <Separator />

      {/* Seasons */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Seasons</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEASON_OPTIONS.map((s) => {
            const active = seasons.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSeason(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                {s}
                {active && <X className="w-3 h-3 ml-1 inline" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Occasions */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Occasions</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {OCCASION_OPTIONS.map((o) => {
            const active = occasions.includes(o);
            return (
              <button
                key={o}
                onClick={() => toggleOccasion(o)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                {o.replace(/-/g, " ")}
                {active && <X className="w-3 h-3 ml-1 inline" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
