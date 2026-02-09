import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */

interface DecorationPlacement {
  id: string;
  code: string;
  label: string;
  garment_type: string;
  max_width_in: number;
  max_height_in: number;
  default_x: number;
  default_y: number;
  default_scale: number;
  sort_order: number;
}

interface LogoPlacement {
  id?: string;
  store_logo_id: string;
  store_logo_variant_id: string | null;
  position: string; // decoration_placement code
  x: number;
  y: number;
  scale: number;
  is_primary: boolean;
  _logo_name?: string;
  _logo_url?: string;
}

interface StoreLogo {
  id: string;
  name: string;
  file_url: string;
  placement: string | null;
  is_primary: boolean;
  method: string;
}

interface Props {
  item: {
    id: string;
    style_id: number;
    catalog_styles?: { style_image: string | null } | null;
    primary_image_url: string | null;
  };
  storeId: string;
}

/* ─── Hook: fetch placement presets ─── */

function usePlacementPresets() {
  return useQuery<DecorationPlacement[]>({
    queryKey: ["decoration-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decoration_placements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as DecorationPlacement[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/* ─── Component ─── */

export function ProductLogosTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const [placements, setPlacements] = useState<LogoPlacement[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activePlacementIdx, setActivePlacementIdx] = useState<number | null>(null);

  const { data: presets = [] } = usePlacementPresets();

  // Group presets by garment_type for the select dropdown
  const presetsByType = useMemo(() => {
    const groups: Record<string, DecorationPlacement[]> = {};
    presets.forEach((p) => {
      if (!groups[p.garment_type]) groups[p.garment_type] = [];
      groups[p.garment_type].push(p);
    });
    return groups;
  }, [presets]);

  // Map code → preset for quick lookup
  const presetMap = useMemo(
    () => new Map(presets.map((p) => [p.code, p])),
    [presets]
  );

  // Fetch store logos
  const { data: storeLogos = [] } = useQuery<StoreLogo[]>({
    queryKey: ["store-logos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_logos")
        .select("id, name, file_url, placement, is_primary, method")
        .eq("team_store_id", storeId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing placements for this product
  const { data: existingPlacements, isLoading } = useQuery({
    queryKey: ["item-logos", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_logos")
        .select("id, store_logo_id, store_logo_variant_id, position, x, y, scale, is_primary, store_logos(name, file_url)")
        .eq("team_store_item_id", item.id);
      if (error) throw error;
      return data;
    },
  });

  // Sync fetched data into local state
  useEffect(() => {
    if (existingPlacements) {
      setPlacements(
        existingPlacements.map((p: any) => ({
          id: p.id,
          store_logo_id: p.store_logo_id,
          store_logo_variant_id: p.store_logo_variant_id,
          position: p.position || "left_chest",
          x: p.x ?? 0.5,
          y: p.y ?? 0.2,
          scale: p.scale ?? 0.3,
          is_primary: p.is_primary ?? false,
          _logo_name: p.store_logos?.name,
          _logo_url: p.store_logos?.file_url,
        }))
      );
      setDirty(false);
    }
  }, [existingPlacements]);

  const addPlacement = () => {
    if (storeLogos.length === 0) {
      toast.error("Add logos to this store first (Logos tab)");
      return;
    }
    const firstLogo = storeLogos[0];
    const defaultPreset = presets.find((p) => p.code === "left_chest") || presets[0];
    setPlacements((prev) => [
      ...prev,
      {
        store_logo_id: firstLogo.id,
        store_logo_variant_id: null,
        position: defaultPreset?.code || "left_chest",
        x: defaultPreset?.default_x ?? 0.35,
        y: defaultPreset?.default_y ?? 0.25,
        scale: defaultPreset?.default_scale ?? 0.15,
        is_primary: prev.length === 0,
        _logo_name: firstLogo.name,
        _logo_url: firstLogo.file_url,
      },
    ]);
    setActivePlacementIdx(placements.length);
    setDirty(true);
  };

  const removePlacement = (idx: number) => {
    setPlacements((prev) => prev.filter((_, i) => i !== idx));
    if (activePlacementIdx === idx) setActivePlacementIdx(null);
    else if (activePlacementIdx !== null && activePlacementIdx > idx) {
      setActivePlacementIdx(activePlacementIdx - 1);
    }
    setDirty(true);
  };

  const updatePlacement = (idx: number, updates: Partial<LogoPlacement>) => {
    setPlacements((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, ...updates };
        if (updates.store_logo_id) {
          const logo = storeLogos.find((l) => l.id === updates.store_logo_id);
          if (logo) {
            updated._logo_name = logo.name;
            updated._logo_url = logo.file_url;
          }
        }
        return updated;
      })
    );
    setDirty(true);
  };

  /** When user selects a placement preset, auto-set position/x/y/scale from defaults */
  const applyPreset = (idx: number, presetCode: string) => {
    const preset = presetMap.get(presetCode);
    if (preset) {
      updatePlacement(idx, {
        position: preset.code,
        x: preset.default_x,
        y: preset.default_y,
        scale: preset.default_scale,
      });
    } else {
      updatePlacement(idx, { position: presetCode });
    }
  };

  /** Compute max scale from the preset's max imprint area relative to a ~16" wide garment */
  const getMaxScale = (presetCode: string): number => {
    const preset = presetMap.get(presetCode);
    if (!preset) return 0.8;
    // Assume garment canvas represents roughly 16" wide
    const maxFraction = Math.max(preset.max_width_in, preset.max_height_in) / 16;
    return Math.min(0.8, Math.max(0.05, maxFraction));
  };

  const setPrimaryPlacement = (idx: number) => {
    setPlacements((prev) =>
      prev.map((p, i) => ({ ...p, is_primary: i === idx }))
    );
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("team_store_item_logos").delete().eq("team_store_item_id", item.id);
      if (placements.length > 0) {
        const rows = placements.map((p) => ({
          team_store_item_id: item.id,
          store_logo_id: p.store_logo_id,
          store_logo_variant_id: p.store_logo_variant_id,
          position: p.position,
          x: p.x,
          y: p.y,
          scale: p.scale,
          is_primary: p.is_primary,
        }));
        const { error } = await supabase.from("team_store_item_logos").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-logos", item.id] });
      queryClient.invalidateQueries({ queryKey: ["team-store-products-public"] });
      queryClient.invalidateQueries({ queryKey: ["team-store-products-preview"] });
      queryClient.invalidateQueries({ queryKey: ["ts-product-detail"] });
      toast.success("Logo placements saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const garmentImage = item.primary_image_url || item.catalog_styles?.style_image || "";
  const active = activePlacementIdx !== null ? placements[activePlacementIdx] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading logo assignments…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini Designer */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Placement Preview</Label>
        <GarmentMockup
          image={garmentImage}
          placements={placements}
          presetMap={presetMap}
          activeIdx={activePlacementIdx}
          onSelectPlacement={setActivePlacementIdx}
          onMovePlacement={(idx, x, y) => updatePlacement(idx, { x, y })}
        />
      </div>

      <Separator />

      {/* Placement list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Assigned Logos ({placements.length})</Label>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addPlacement}>
            <Plus className="w-3 h-3 mr-1" /> Add Logo
          </Button>
        </div>

        {placements.length === 0 && (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No logos assigned. Click "Add Logo" to place a logo on this product.
          </p>
        )}

        {placements.map((p, idx) => {
          const preset = presetMap.get(p.position);
          const maxScale = getMaxScale(p.position);

          return (
            <div
              key={idx}
              onClick={() => setActivePlacementIdx(idx)}
              className={`border rounded-md p-2.5 cursor-pointer transition-colors ${
                activePlacementIdx === idx ? "border-accent bg-accent/5" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {p._logo_url && (
                  <img src={p._logo_url} alt="" className="w-8 h-8 object-contain rounded bg-muted border p-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p._logo_name || "Logo"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {preset?.label || p.position}
                    {preset && (
                      <span className="ml-1 text-muted-foreground/60">
                        (max {preset.max_width_in}"×{preset.max_height_in}")
                      </span>
                    )}
                  </p>
                </div>
                {p.is_primary && (
                  <Badge variant="secondary" className="text-[9px] shrink-0">Primary</Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removePlacement(idx); }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>

              {/* Expanded controls when active */}
              {activePlacementIdx === idx && (
                <div className="mt-3 space-y-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                  {/* Logo select */}
                  <div className="space-y-1">
                    <Label className="text-[10px]">Logo</Label>
                    <Select value={p.store_logo_id} onValueChange={(v) => updatePlacement(idx, { store_logo_id: v })}>
                      <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {storeLogos.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            <span className="flex items-center gap-2">
                              <img src={l.file_url} alt="" className="w-4 h-4 object-contain" />
                              {l.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Placement Preset */}
                  <div className="space-y-1">
                    <Label className="text-[10px]">Placement</Label>
                    <Select value={p.position} onValueChange={(v) => applyPreset(idx, v)}>
                      <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(presetsByType).map(([type, items]) => (
                          <React.Fragment key={type}>
                            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {type === "apparel" ? "Apparel" : type === "hat" ? "Hats" : "Bags"}
                            </div>
                            {items.map((preset) => (
                              <SelectItem key={preset.code} value={preset.code}>
                                {preset.label}
                                <span className="ml-1 text-muted-foreground text-[10px]">
                                  ({preset.max_width_in}"×{preset.max_height_in}")
                                </span>
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scale slider — constrained to preset max */}
                  <div className="space-y-1">
                    <Label className="text-[10px]">
                      Scale: {Math.round(p.scale * 100)}%
                      <span className="text-muted-foreground ml-1">(max {Math.round(maxScale * 100)}%)</span>
                    </Label>
                    <Slider
                      min={5}
                      max={Math.round(maxScale * 100)}
                      step={1}
                      value={[Math.min(Math.round(p.scale * 100), Math.round(maxScale * 100))]}
                      onValueChange={([v]) => updatePlacement(idx, { scale: v / 100 })}
                      className="w-full"
                    />
                  </div>

                  {/* Coordinates */}
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>X: {p.x.toFixed(2)}</span>
                    <span>Y: {p.y.toFixed(2)}</span>
                  </div>

                  {/* Primary toggle */}
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_primary} onCheckedChange={() => setPrimaryPlacement(idx)} />
                    <Label className="text-[10px]">Primary logo for this product</Label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      {dirty && (
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          <Save className="w-3 h-3 mr-1" /> Save Placements
        </Button>
      )}
    </div>
  );
}

/* ─── Garment Mockup with Draggable Logos ─── */

interface MockupProps {
  image: string;
  placements: LogoPlacement[];
  presetMap: Map<string, DecorationPlacement>;
  activeIdx: number | null;
  onSelectPlacement: (idx: number) => void;
  onMovePlacement: (idx: number, x: number, y: number) => void;
}

function GarmentMockup({ image, placements, presetMap, activeIdx, onSelectPlacement, onMovePlacement }: MockupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlacement(idx);
    setDragging(idx);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelectPlacement]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onMovePlacement(dragging, x, y);
  }, [dragging, onMovePlacement]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted/30 border rounded-lg overflow-hidden select-none"
      style={{ aspectRatio: "3/4" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {image ? (
        <img
          src={image}
          alt="Garment"
          className="w-full h-full object-contain p-4 pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-16 h-16 text-muted-foreground/20" />
        </div>
      )}

      {/* Logo overlays */}
      {placements.map((p, idx) => {
        if (!p._logo_url) return null;
        const size = p.scale * 100;
        const isActive = activeIdx === idx;
        const preset = presetMap.get(p.position);
        return (
          <div
            key={idx}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
              isActive ? "ring-2 ring-accent ring-offset-1 z-10" : "z-0 hover:ring-1 hover:ring-muted-foreground/30"
            }`}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${size}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <img
              src={p._logo_url}
              alt={p._logo_name || "Logo"}
              className="w-full h-auto object-contain pointer-events-none"
              draggable={false}
            />
            {isActive && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap">
                {preset?.label || p.position}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
