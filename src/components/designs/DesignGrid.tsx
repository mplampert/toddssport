import { useState } from "react";
import { useDesignTemplates, DESIGN_CATEGORIES, DesignTemplate } from "@/hooks/useDesignTemplates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESIGN_IMAGE_FALLBACKS } from "@/lib/designImageFallbacks";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface DesignGridProps {
  /** Admin mode: called with design code when a tile is clicked */
  onSelectDesign?: (code: string) => void;
  /** If true, suppresses the public info modal in favor of onSelectDesign */
  adminMode?: boolean;
}

export function DesignGrid({ onSelectDesign, adminMode = false }: DesignGridProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate | null>(null);
  const [selectedTeamStoreId, setSelectedTeamStoreId] = useState("");
  const queryClient = useQueryClient();

  const { data: designs = [], isLoading } = useDesignTemplates(
    activeCategory === "all" ? undefined : activeCategory,
  );

  const { data: teamStores } = useQuery({
    queryKey: ["design-grid-team-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, organization")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ design, storeId }: { design: DesignTemplate; storeId: string }) => {
      const imageUrl = design.image_url || DESIGN_IMAGE_FALLBACKS[design.code];
      if (!imageUrl) throw new Error("No image available for this design");

      // If it's a remote URL, we need to download and re-upload to store-logos bucket
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const ext = imageUrl.includes(".svg") ? "svg" : imageUrl.includes(".png") ? "png" : "png";
      const contentType = ext === "svg" ? "image/svg+xml" : "image/png";
      const path = `${storeId}/${design.code}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("store-logos")
        .upload(path, blob, { upsert: true, contentType });
      if (uploadErr) throw uploadErr;

      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/store-logos/${path}`;

      const { data: newLogo, error: logoErr } = await supabase
        .from("store_logos")
        .insert({
          team_store_id: storeId,
          name: `${design.code} — ${design.name}`,
          method: "multi",
          placement: "left_front",
          decoration_type: "screen_print",
          file_url: fileUrl,
          file_type: ext === "svg" ? "svg" : "image",
          original_file_url: ext === "svg" ? fileUrl : null,
        } as any)
        .select("id")
        .single();
      if (logoErr) throw logoErr;

      // Create default variant
      await supabase.from("store_logo_variants" as any).insert({
        store_logo_id: newLogo.id,
        name: "Default",
        colorway: "original",
        file_url: fileUrl,
        screen_print_enabled: true,
        embroidery_enabled: false,
        dtf_enabled: false,
        background_rule: "any",
        is_default: true,
        file_type: ext === "svg" ? "svg" : "image",
        original_file_url: ext === "svg" ? fileUrl : null,
      });

      return fileUrl;
    },
    onSuccess: () => {
      toast.success("Design saved to Team Logos!", {
        description: "The design has been added to the store's logo library.",
      });
      queryClient.invalidateQueries({ queryKey: ["store-logos"] });
      queryClient.invalidateQueries({ queryKey: ["global-team-logos"] });
      setSelectedDesign(null);
      setSelectedTeamStoreId("");
    },
    onError: (err: any) => {
      toast.error("Failed to save design", { description: err.message });
    },
  });

  const filtered = search.trim()
    ? designs.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.code.toLowerCase().includes(search.toLowerCase()) ||
          d.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : designs;

  const handleTileClick = (design: DesignTemplate) => {
    if (adminMode && onSelectDesign) {
      onSelectDesign(design.code);
    } else {
      setSelectedDesign(design);
    }
  };

  return (
    <section className="container mx-auto px-4 py-10 md:py-16">
      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-primary p-1 rounded-none md:rounded-md">
          <TabsTrigger
            value="all"
            className="text-xs md:text-sm font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-primary-foreground/70 rounded-sm px-4 py-2"
          >
            All
          </TabsTrigger>
          {DESIGN_CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="text-xs md:text-sm font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-primary-foreground/70 rounded-sm px-4 py-2"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search designs by name, code, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No designs found</p>
          <p className="text-sm mt-1">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((design) => (
            <button
              key={design.id}
              onClick={() => handleTileClick(design)}
              className="group relative bg-destructive/10 rounded-lg overflow-hidden border border-border hover:border-accent transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {(design.image_url || DESIGN_IMAGE_FALLBACKS[design.code]) ? (
                <img
                  src={design.image_url || DESIGN_IMAGE_FALLBACKS[design.code]}
                  alt={design.name}
                  className="w-full aspect-square object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground text-xs">No image</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground px-2 py-1.5">
                <p className="text-[10px] md:text-xs font-mono truncate">{design.code}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Public Info Modal */}
      <Dialog open={!!selectedDesign && !adminMode} onOpenChange={() => { setSelectedDesign(null); setSelectedTeamStoreId(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDesign?.name}</DialogTitle>
            <DialogDescription>Design Code: {selectedDesign?.code}</DialogDescription>
          </DialogHeader>

          {(selectedDesign?.image_url || (selectedDesign && DESIGN_IMAGE_FALLBACKS[selectedDesign.code])) && (
            <img
              src={selectedDesign!.image_url || DESIGN_IMAGE_FALLBACKS[selectedDesign!.code]}
              alt={selectedDesign!.name}
              className="w-full max-h-64 object-contain bg-muted rounded-lg p-4"
            />
          )}

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Sport:</span>
              <span className="capitalize">{selectedDesign?.sport}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Category:</span>
              <Badge variant="secondary" className="capitalize">
                {DESIGN_CATEGORIES.find((c) => c.value === selectedDesign?.category)?.label ?? selectedDesign?.category}
              </Badge>
            </div>
            {selectedDesign?.tags && selectedDesign.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDesign.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Save to Team Logos */}
          {teamStores && teamStores.length > 0 && (
            <div className="border-t pt-4 mt-2 space-y-3">
              <Label className="text-sm font-medium">Save to Team Logos</Label>
              <div className="flex gap-2">
                <Select value={selectedTeamStoreId} onValueChange={setSelectedTeamStoreId}>
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="Select a team store…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamStores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.organization ? ` — ${s.organization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedTeamStoreId || saveMutation.isPending}
                  onClick={() => {
                    if (selectedDesign && selectedTeamStoreId) {
                      saveMutation.mutate({ design: selectedDesign, storeId: selectedTeamStoreId });
                    }
                  }}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-2">
            Interested in this design? <a href="/contact" className="text-accent underline">Contact us</a> to get started!
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
