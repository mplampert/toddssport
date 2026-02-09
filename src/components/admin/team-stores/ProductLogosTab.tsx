import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Loader2, ImageIcon, RotateCcw, AlertCircle } from "lucide-react";
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
  position: string;
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

/* ─── Main Component ─── */

export function ProductLogosTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const [placements, setPlacements] = useState<LogoPlacement[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activePlacementIdx, setActivePlacementIdx] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");

  const { data: presets = [] } = usePlacementPresets();

  const presetsByType = useMemo(() => {
    const groups: Record<string, DecorationPlacement[]> = {};
    presets.forEach((p) => {
      if (!groups[p.garment_type]) groups[p.garment_type] = [];
      groups[p.garment_type].push(p);
    });
    return groups;
  }, [presets]);

  const presetMap = useMemo(
    () => new Map(presets.map((p) => [p.code, p])),
    [presets]
  );

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

  useEffect(() => {
    if (existingPlacements) {
      const mapped = existingPlacements.map((p: any) => ({
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
      }));
      setPlacements(mapped);
      setSavedSnapshot(JSON.stringify(mapped));
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

  const updatePlacement = useCallback((idx: number, updates: Partial<LogoPlacement>) => {
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
  }, [storeLogos]);

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

  const getMaxScale = (presetCode: string): number => {
    const preset = presetMap.get(presetCode);
    if (!preset) return 0.8;
    const maxFraction = Math.max(preset.max_width_in, preset.max_height_in) / 16;
    return Math.min(0.8, Math.max(0.05, maxFraction));
  };

  const setPrimaryPlacement = (idx: number) => {
    setPlacements((prev) =>
      prev.map((p, i) => ({ ...p, is_primary: i === idx }))
    );
    setDirty(true);
  };

  const resetChanges = () => {
    if (savedSnapshot) {
      setPlacements(JSON.parse(savedSnapshot));
      setDirty(false);
      setActivePlacementIdx(null);
    }
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
      setSavedSnapshot(JSON.stringify(placements));
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
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 220px)" }}>
      {/* ─── Canvas + Controls ─── */}
      <div className="flex-1 space-y-4 pb-20">
        {/* Placement Canvas — hero element */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Placement Canvas</Label>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addPlacement}>
              <Plus className="w-3 h-3 mr-1" /> Add Logo
            </Button>
          </div>
          <PlacementCanvas
            image={garmentImage}
            placements={placements}
            presetMap={presetMap}
            activeIdx={activePlacementIdx}
            onSelectPlacement={setActivePlacementIdx}
            onMovePlacement={(idx, x, y) => updatePlacement(idx, { x, y })}
          />
        </div>

        {/* ─── Controls for active placement ─── */}
        {active && activePlacementIdx !== null && (
          <div className="border rounded-lg p-4 bg-card space-y-4">
            <div className="flex items-center gap-3">
              {active._logo_url && (
                <img src={active._logo_url} alt="" className="w-10 h-10 object-contain rounded bg-muted border p-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{active._logo_name || "Logo"}</p>
                <p className="text-xs text-muted-foreground">
                  {presetMap.get(active.position)?.label || active.position}
                </p>
              </div>
              {active.is_primary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removePlacement(activePlacementIdx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Logo select */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Logo</Label>
                <Select value={active.store_logo_id} onValueChange={(v) => updatePlacement(activePlacementIdx, { store_logo_id: v })}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
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
                <Label className="text-[11px] text-muted-foreground">Placement</Label>
                <Select value={active.position} onValueChange={(v) => applyPreset(activePlacementIdx, v)}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
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
            </div>

            {/* Scale slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">
                  Scale: {Math.round(active.scale * 100)}%
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  max {Math.round(getMaxScale(active.position) * 100)}%
                </span>
              </div>
              <Slider
                min={3}
                max={Math.round(getMaxScale(active.position) * 100)}
                step={1}
                value={[Math.min(Math.round(active.scale * 100), Math.round(getMaxScale(active.position) * 100))]}
                onValueChange={([v]) => updatePlacement(activePlacementIdx, { scale: v / 100 })}
                className="w-full"
              />
            </div>

            {/* Primary toggle + debug coords */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={active.is_primary} onCheckedChange={() => setPrimaryPlacement(activePlacementIdx)} />
                <Label className="text-[11px]">Primary logo</Label>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                x:{active.x.toFixed(2)} y:{active.y.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ─── Placement list chips ─── */}
        {placements.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">All Placements ({placements.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {placements.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePlacementIdx(idx)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                    activePlacementIdx === idx
                      ? "border-accent bg-accent/10 text-accent-foreground font-medium"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p._logo_url && <img src={p._logo_url} alt="" className="w-4 h-4 object-contain rounded" />}
                  {presetMap.get(p.position)?.label || p.position}
                  {p.is_primary && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">★</Badge>}
                </button>
              ))}
            </div>
          </div>
        )}

        {placements.length === 0 && (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No logos assigned to this product.</p>
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={addPlacement}>
              <Plus className="w-3 h-3 mr-1" /> Add Logo
            </Button>
          </div>
        )}
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t py-3 px-1 -mx-1 flex items-center gap-3 z-20">
        {dirty && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Unsaved changes</span>
          </div>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={resetChanges}
          disabled={!dirty || saveMutation.isPending}
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          <Save className="w-3 h-3 mr-1" /> Save Placements
        </Button>
      </div>
    </div>
  );
}

/* ─── Placement Canvas with Drag ─── */

interface CanvasProps {
  image: string;
  placements: LogoPlacement[];
  presetMap: Map<string, DecorationPlacement>;
  activeIdx: number | null;
  onSelectPlacement: (idx: number) => void;
  onMovePlacement: (idx: number, x: number, y: number) => void;
}

function PlacementCanvas({ image, placements, presetMap, activeIdx, onSelectPlacement, onMovePlacement }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlacement(idx);

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const p = placements[idx];

    // Offset = pointer position relative to logo center (in normalized coords)
    const pointerX = (e.clientX - rect.left) / rect.width;
    const pointerY = (e.clientY - rect.top) / rect.height;
    dragRef.current = {
      idx,
      offsetX: pointerX - p.x,
      offsetY: pointerY - p.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelectPlacement, placements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { idx, offsetX, offsetY } = dragRef.current;

    const rawX = (e.clientX - rect.left) / rect.width - offsetX;
    const rawY = (e.clientY - rect.top) / rect.height - offsetY;

    const x = Math.max(0.02, Math.min(0.98, rawX));
    const y = Math.max(0.02, Math.min(0.98, rawY));

    onMovePlacement(idx, x, y);
  }, [onMovePlacement]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleCanvasClick = useCallback((e: React.PointerEvent) => {
    // Clicked canvas background — deselect
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "IMG") {
      // don't deselect if it was a garment image click
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted/20 border-2 border-dashed border-muted-foreground/15 rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: "4/5", maxHeight: "420px" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Garment image */}
      {image ? (
        <img
          src={image}
          alt="Garment"
          className="w-full h-full object-contain p-6 pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-20 h-20 text-muted-foreground/10" />
        </div>
      )}

      {/* Placement zone hint for active placement */}
      {activeIdx !== null && placements[activeIdx] && (() => {
        const preset = presetMap.get(placements[activeIdx].position);
        if (!preset) return null;
        // Show a subtle zone rectangle based on preset defaults
        const zoneW = (preset.max_width_in / 16) * 100;
        const zoneH = (preset.max_height_in / 20) * 100;
        return (
          <div
            className="absolute border border-dashed border-accent/30 rounded-md pointer-events-none"
            style={{
              left: `${preset.default_x * 100}%`,
              top: `${preset.default_y * 100}%`,
              width: `${zoneW}%`,
              height: `${zoneH}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-accent/50 whitespace-nowrap">
              {preset.label}
            </span>
          </div>
        );
      })()}

      {/* Logo overlays */}
      {placements.map((p, idx) => {
        if (!p._logo_url) return null;
        const size = p.scale * 100;
        const isActive = activeIdx === idx;
        return (
          <div
            key={idx}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            className={`absolute cursor-grab active:cursor-grabbing transition-shadow rounded ${
              isActive
                ? "ring-2 ring-accent shadow-lg z-10"
                : "z-0 hover:ring-1 hover:ring-muted-foreground/30 opacity-80 hover:opacity-100"
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
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                {presetMap.get(p.position)?.label || p.position}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state overlay */}
      {placements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground/40">Add a logo to start designing</p>
        </div>
      )}
    </div>
  );
}
