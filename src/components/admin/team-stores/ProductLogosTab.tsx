import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Save, Loader2, ImageIcon, RotateCcw, AlertCircle, Upload, Replace, Type, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { PlacementCanvas, type DecorationPlacement, type LogoPlacement } from "./PlacementCanvas";
import { StoreLogoPicker, type StoreLogo } from "./StoreLogoPicker";
import { type LogoVariantOption } from "@/lib/logoVariantPicker";
import { useProductVariantImages, type VariantImage } from "@/hooks/useVariantImages";
import { TextLayerPanel } from "./TextLayerPanel";
import { type TextLayer, DEFAULT_TEXT_LAYER, TEXT_SOURCE_LABELS, type TextLayerSource, resolveTextContent, applyTextTransform } from "@/lib/textLayers";
import { compositeAndUploadMockup, saveMockupUrl } from "@/lib/mockupCompositor";

/* ─── Types ─── */

interface ColorOption {
  code: string;
  name: string;
  frontImage?: string;
  backImage?: string;
  sideImage?: string;
  swatchImage?: string;
  color1?: string;
  color2?: string;
}

interface Props {
  item: {
    id: string;
    style_id: number;
    catalog_styles?: { style_id: number; style_image: string | null } | null;
    primary_image_url: string | null;
    allowed_colors?: any;
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
  const ssStyleId = item.catalog_styles?.style_id ?? item.style_id;

  // ── Variant state ──
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [applyToAllColors, setApplyToAllColors] = useState(false);
  // Prevent auto-default logic from overriding a user's explicit toggle choice
  const applyModeUserSetRef = useRef(false);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [activeView, setActiveView] = useState<"front" | "back" | "left_sleeve" | "right_sleeve">("front");
  const [reuseSleeveForAllColors, setReuseSleeveForAllColors] = useState(true);

  // ── Placement state ──
  const [placements, setPlacements] = useState<LogoPlacement[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activePlacementIdx, setActivePlacementIdx] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");

  // ── Text layer state ──
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [activeTextIdx, setActiveTextIdx] = useState<number | null>(null);
  const [textDirty, setTextDirty] = useState(false);
  const [savedTextSnapshot, setSavedTextSnapshot] = useState<string>("");

  // ── Variant images for sleeve backgrounds ──
  const { data: variantImages = [] } = useProductVariantImages(item.id);

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

  // Fetch all logo variants for this store's logos
  const storeLogoIds = useMemo(() => storeLogos.map((l) => l.id), [storeLogos]);
  const { data: allVariants = [] } = useQuery<LogoVariantOption[]>({
    queryKey: ["store-logo-variants", storeId],
    queryFn: async () => {
      if (storeLogoIds.length === 0) return [];
      const { data, error } = await supabase
        .from("store_logo_variants")
        .select("id, store_logo_id, name, colorway, file_url, background_rule, is_default")
        .in("store_logo_id", storeLogoIds);
      if (error) throw error;
      return data as any;
    },
    enabled: storeLogoIds.length > 0,
  });

  // Group variants by store_logo_id
  const variantsByLogo = useMemo(() => {
    const map = new Map<string, (LogoVariantOption & { store_logo_id: string })[]>();
    for (const v of allVariants as any[]) {
      const arr = map.get(v.store_logo_id) || [];
      arr.push(v);
      map.set(v.store_logo_id, arr);
    }
    return map;
  }, [allVariants]);

  // Fetch ALL logo assignments for this product (all variants)
  const { data: existingPlacements, isLoading } = useQuery({
    queryKey: ["item-logos", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_logos")
        .select("id, store_logo_id, store_logo_variant_id, position, x, y, scale, rotation, is_primary, role, sort_order, active, variant_color, variant_size, view, store_logos(name, file_url)")
        .eq("team_store_item_id", item.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL text layers for this product
  const { data: existingTextLayers, isLoading: isLoadingText } = useQuery({
    queryKey: ["item-text-layers", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_text_layers")
        .select("*")
        .eq("team_store_item_id", item.id)
        .order("sort_order");
      if (error) throw error;
      return data as TextLayer[];
    },
  });

  // Set of store_logo_ids currently assigned to this product (across all placements being edited)
  const assignedLogoIds = useMemo(() => {
    return new Set(placements.map((p) => p.store_logo_id));
  }, [placements]);

  // Per-logo view usage across ALL views (from raw DB data, not just current view)
  const logoViewUsage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!existingPlacements) return map;
    for (const p of existingPlacements as any[]) {
      const key = p.store_logo_id;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(p.view || "front");
    }
    return map;
  }, [existingPlacements]);

  function getUsageLabel(logoId: string): string {
    const views = logoViewUsage.get(logoId);
    if (!views || views.size === 0) return "Not placed";
    const parts: string[] = [];
    if (views.has("front")) parts.push("Front");
    if (views.has("back")) parts.push("Back");
    if (views.has("left_sleeve") || views.has("right_sleeve")) {
      if (views.has("left_sleeve") && views.has("right_sleeve")) parts.push("L/R Sleeve");
      else if (views.has("left_sleeve")) parts.push("L Sleeve");
      else parts.push("R Sleeve");
    }
    return parts.length > 0 ? parts.join(" + ") : "Not placed";
  }

  function getFirstView(logoId: string): "front" | "back" | "left_sleeve" | "right_sleeve" | undefined {
    const views = logoViewUsage.get(logoId);
    if (!views) return undefined;
    if (views.has("front")) return "front";
    if (views.has("back")) return "back";
    if (views.has("left_sleeve")) return "left_sleeve";
    if (views.has("right_sleeve")) return "right_sleeve";
    return undefined;
  }

  // Fetch color variants from S&S API
  useEffect(() => {
    let cancelled = false;
    async function fetchColors() {
      setLoadingVariants(true);
      try {
        const products = await getProducts({ style: String(ssStyleId) });
        if (cancelled) return;

        const allowedCodes = (() => {
          const raw = item.allowed_colors;
          if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
          return new Set((raw as { code: string }[]).map((c) => c.code));
        })();

        const map = new Map<string, ColorOption>();
        (products as SSProduct[]).forEach((p) => {
          if (!p.colorName || map.has(p.colorCode)) return;
          if (allowedCodes && !allowedCodes.has(p.colorCode)) return;
          map.set(p.colorCode, {
            code: p.colorCode,
            name: p.colorName,
            frontImage: p.colorFrontImage,
            backImage: p.colorBackImage,
            sideImage: p.colorSideImage || p.colorDirectSideImage,
            swatchImage: p.colorSwatchImage,
            color1: p.color1,
            color2: p.color2,
          });
        });
        const opts = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        setColorOptions(opts);
        if (opts.length > 0 && !selectedColor) setSelectedColor(opts[0].code);
      } catch {
        // silently fail — colors are optional
      } finally {
        if (!cancelled) setLoadingVariants(false);
      }
    }
    fetchColors();
    return () => { cancelled = true; };
  }, [ssStyleId, item.allowed_colors]);

  // When existing placements load or selectedColor changes, filter to relevant placements
  useEffect(() => {
    if (!existingPlacements) return;

    const all = existingPlacements.map((p: any) => {
      // Resolve logo URL: prefer the specific variant's image, then the logo's base image
      let resolvedUrl = p.store_logos?.file_url;
      if (p.store_logo_variant_id) {
        const variants = variantsByLogo.get(p.store_logo_id) || [];
        const variant = variants.find((v) => v.id === p.store_logo_variant_id);
        if (variant) resolvedUrl = variant.file_url;
      }

      return {
        id: p.id,
        store_logo_id: p.store_logo_id,
        store_logo_variant_id: p.store_logo_variant_id,
        // Persisted rows are ALWAYS locked — the user's choice is sacred
        variant_locked: true,
        position: p.position || "left_chest",
        x: p.x ?? 0.5,
        y: p.y ?? 0.2,
        scale: p.scale ?? 0.3,
        rotation: p.rotation ?? 0,
        is_primary: p.is_primary ?? false,
        role: p.role || "primary",
        sort_order: p.sort_order ?? 0,
        active: p.active ?? true,
        variant_color: p.variant_color ?? null,
        variant_size: p.variant_size ?? null,
        view: p.view ?? "front",
        _logo_name: p.store_logos?.name,
        _logo_url: resolvedUrl,
      };
    });

    const hasColorOverrides = all.some((p: LogoPlacement) => p.variant_color != null);
    // Default to per-color mode when multiple colors exist.
    // IMPORTANT: once a user explicitly toggles the mode, never auto-flip it again.
    const shouldApplyAll = !hasColorOverrides && colorOptions.length <= 1;
    if (!applyModeUserSetRef.current) setApplyToAllColors(shouldApplyAll);
    const applyAll = applyModeUserSetRef.current ? applyToAllColors : shouldApplyAll;

    const filtered = filterPlacementsForEditing(all, selectedColor, applyAll, activeView);

    // NO auto-pick — the user explicitly chooses which logo variant goes on which shirt color.
    // The variant dropdown in the controls panel is the only way to change it.

    setPlacements(filtered);
    setSavedSnapshot(JSON.stringify(all));
    setDirty(false);
    setActivePlacementIdx(null);
  }, [existingPlacements, selectedColor, activeView, colorOptions, variantsByLogo, applyToAllColors]);

  // When text layers load or view changes, filter to current view
  useEffect(() => {
    if (!existingTextLayers) return;
    const viewFiltered = existingTextLayers.filter((t) => (t.view || "front") === activeView);
    setTextLayers(viewFiltered);
    setSavedTextSnapshot(JSON.stringify(existingTextLayers));
    setTextDirty(false);
    setActiveTextIdx(null);
  }, [existingTextLayers, activeView]);

  function filterPlacementsForEditing(all: LogoPlacement[], color: string | null, allColors: boolean, view: string): LogoPlacement[] {
    // Filter by view first
    const viewFiltered = all.filter((p) => (p.view || "front") === view);
    if (allColors) {
      return viewFiltered.filter((p) => !p.variant_color);
    }
    const colorSpecific = viewFiltered.filter((p) => p.variant_color === color);
    if (colorSpecific.length > 0) return colorSpecific;
    // Fallback: copy global placements to this color — keep variant_locked: true
    // so the variant stays as-is until the user explicitly changes it via the dropdown.
    return viewFiltered.filter((p) => !p.variant_color).map((p) => ({
      ...p,
      id: undefined,
      variant_color: color,
      variant_locked: true,
    }));
  }

  // Add a store logo to this product with default variant (user picks the right one via dropdown)
  const addLogoToProduct = (logo: StoreLogo) => {
    const defaultPresetCode = activeView === "back" ? "upper_back"
      : activeView === "left_sleeve" ? "left_sleeve"
      : activeView === "right_sleeve" ? "right_sleeve"
      : "left_chest";
    const defaultPreset = presets.find((p) => p.code === defaultPresetCode) || presets[0];
    const logoVariants = variantsByLogo.get(logo.id) || [];
    // Use the default variant (or first one), NOT auto-picked by garment color
    const defaultVariant = logoVariants.find((v) => v.is_default) || logoVariants[0] || null;

    setPlacements((prev) => [
      ...prev,
      {
        store_logo_id: logo.id,
        store_logo_variant_id: defaultVariant?.id || null,
        variant_locked: true,
        position: defaultPreset?.code || "left_chest",
        x: defaultPreset?.default_x ?? 0.35,
        y: defaultPreset?.default_y ?? 0.25,
        scale: defaultPreset?.default_scale ?? 0.15,
        rotation: 0,
        is_primary: placements.length === 0,
        role: placements.length === 0 ? "primary" : "secondary",
        sort_order: placements.length,
        active: true,
        variant_color: applyToAllColors ? null : selectedColor,
        variant_size: null,
        view: activeView,
        _logo_name: logo.name,
        _logo_url: defaultVariant?.file_url || logo.file_url,
      },
    ]);
    setActivePlacementIdx(placements.length);
    setDirty(true);
    toast.success(`Added "${logo.name}" — choose the logo variant for this color in the controls panel`);
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
    if (savedSnapshot && existingPlacements) {
      const all = JSON.parse(savedSnapshot) as LogoPlacement[];
      const hasColorOverrides = all.some((p) => p.variant_color != null);
      setPlacements(filterPlacementsForEditing(all, selectedColor, !hasColorOverrides, activeView));
      setDirty(false);
      setActivePlacementIdx(null);
    }
    if (savedTextSnapshot && existingTextLayers) {
      const allText = JSON.parse(savedTextSnapshot) as TextLayer[];
      setTextLayers(allText.filter((t) => (t.view || "front") === activeView));
      setTextDirty(false);
      setActiveTextIdx(null);
    }
  };

  // ── Text layer CRUD ──
  const addTextLayer = (source: TextLayerSource) => {
    const defaultY = source === "personalization_number" ? 0.6
      : source === "personalization_name" ? 0.45
      : 0.5;
    const defaultText = source === "static_text" ? "TEXT"
      : source === "name_number_template" ? "{LAST_NAME} {NUMBER}"
      : null;
    const newLayer: TextLayer = {
      ...DEFAULT_TEXT_LAYER,
      source,
      view: activeView,
      y: defaultY,
      static_text: source === "static_text" ? defaultText : null,
      text_pattern: source === "name_number_template" ? defaultText : null,
      variant_color: applyToAllColors ? null : selectedColor,
      sort_order: textLayers.length,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setActiveTextIdx(textLayers.length);
    setActivePlacementIdx(null);
    setTextDirty(true);
    toast.success(`Added ${TEXT_SOURCE_LABELS[source]} text to ${activeView} view`);
  };

  const removeTextLayer = (idx: number) => {
    setTextLayers((prev) => prev.filter((_, i) => i !== idx));
    if (activeTextIdx === idx) setActiveTextIdx(null);
    else if (activeTextIdx !== null && activeTextIdx > idx) setActiveTextIdx(activeTextIdx - 1);
    setTextDirty(true);
  };

  const updateTextLayer = useCallback((idx: number, updates: Partial<TextLayer>) => {
    setTextLayers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...updates } : t)));
    setTextDirty(true);
  }, []);

  const anyDirty = dirty || textDirty;

  type SavePayload = {
    view: "front" | "back" | "left_sleeve" | "right_sleeve";
    applyToAllColors: boolean;
    selectedColor: string | null;
    placements: LogoPlacement[];
    textLayers: TextLayer[];
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      const { view, applyToAllColors: applyAll, selectedColor: color, placements: placementsSnap, textLayers: textLayersSnap } = payload;

      // ── Save logo placements ──
      if (applyAll) {
        await supabase
          .from("team_store_item_logos")
          .delete()
          .eq("team_store_item_id", item.id)
          .eq("view", view);

        if (placementsSnap.length > 0) {
          const rows = placementsSnap.map((p, i) => ({
            team_store_item_id: item.id,
            store_logo_id: p.store_logo_id,
            store_logo_variant_id: p.store_logo_variant_id,
            position: p.position,
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotation: p.rotation,
            is_primary: p.is_primary,
            role: p.role,
            sort_order: i,
            active: p.active,
            variant_color: null,
            variant_size: null,
            view,
          }));
          const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
          if (error) throw error;
        }
      } else {
        if (!color) throw new Error("Please choose an apparel color before saving.");

        // Only delete rows for the specific color being saved — preserve null (all-colors) fallback rows
        const { error: delErr } = await supabase
          .from("team_store_item_logos")
          .delete()
          .eq("team_store_item_id", item.id)
          .eq("view", view)
          .eq("variant_color", color);
        if (delErr) throw delErr;

        if (placementsSnap.length > 0) {
          const rows = placementsSnap.map((p, i) => ({
            team_store_item_id: item.id,
            store_logo_id: p.store_logo_id,
            store_logo_variant_id: p.store_logo_variant_id,
            position: p.position,
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotation: p.rotation,
            is_primary: p.is_primary,
            role: p.role,
            sort_order: i,
            active: p.active,
            variant_color: color,
            variant_size: null,
            view,
          }));
          const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
          if (error) throw error;
        }
      }

      // ── Save text layers for current view ──
      await supabase
        .from("team_store_item_text_layers")
        .delete()
        .eq("team_store_item_id", item.id)
        .eq("view", view);

      if (textLayersSnap.length > 0) {
        const rows = textLayersSnap.map((t, i) => ({
          team_store_item_id: item.id,
          source: t.source,
          view,
          x: t.x,
          y: t.y,
          scale: t.scale,
          rotation: t.rotation,
          z_index: t.z_index,
          static_text: t.static_text,
          text_pattern: t.text_pattern,
          custom_field_id: t.custom_field_id,
          font_family: t.font_family,
          font_weight: t.font_weight,
          font_size_px: t.font_size_px,
          text_transform: t.text_transform,
          fill_color: t.fill_color,
          outline_color: t.outline_color,
          outline_thickness: t.outline_thickness,
          letter_spacing: t.letter_spacing,
          line_height: t.line_height,
          alignment: t.alignment,
          variant_color: applyAll ? null : color,
          active: t.active,
          sort_order: i,
        }));
        const { error } = await supabase.from("team_store_item_text_layers").insert(rows as any);
        if (error) throw error;
      }

      return payload;
    },
    onSuccess: async (payload) => {
      const { view, applyToAllColors: applyAll, selectedColor: color, placements: placementsSnap, textLayers: textLayersSnap } = payload;
      const variantColorToSave = applyAll ? null : color;

      // Update local cache immediately so switching colors right after Save doesn't re-filter from stale data.
      queryClient.setQueryData(["item-logos", item.id], (old: any[] | undefined) => {
        const prev = Array.isArray(old) ? old : [];

        const next = prev.filter((row) => {
          if (row.team_store_item_id !== item.id) return true;
          if ((row.view || "front") !== view) return true;
          if (applyAll) return false; // replacing all colors for this view
          return (row.variant_color ?? null) !== variantColorToSave;
        });

        const rows = placementsSnap.map((p, i) => {
          const logo = storeLogos.find((l) => l.id === p.store_logo_id);
          return {
            team_store_item_id: item.id,
            store_logo_id: p.store_logo_id,
            store_logo_variant_id: p.store_logo_variant_id,
            position: p.position,
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotation: p.rotation,
            is_primary: p.is_primary,
            role: p.role,
            sort_order: i,
            active: p.active,
            variant_color: variantColorToSave,
            variant_size: null,
            view,
            store_logos: logo ? { name: logo.name, file_url: logo.file_url } : null,
          };
        });

        return [...next, ...rows];
      });

      queryClient.invalidateQueries({ queryKey: ["item-logos", item.id] });
      queryClient.invalidateQueries({ queryKey: ["item-text-layers", item.id] });
      queryClient.invalidateQueries({ queryKey: ["store-logos", storeId] });
      queryClient.invalidateQueries({ queryKey: ["storefront-product-logos"] });
      queryClient.invalidateQueries({ queryKey: ["ts-product-detail"] });
      toast.success("Placements saved");
      setDirty(false);
      setTextDirty(false);

      // ── Generate composited mockup image (Phase 1: front view only) ──
      if (view === "front" && canvasImageInfo.url) {
        const colorsToComposite = applyAll
          ? colorOptions.map((c) => c.code)
          : color ? [color] : [];

        for (const colorCode of colorsToComposite) {
          // Resolve the correct garment image for this color
          const colorOpt = colorOptions.find((c) => c.code === colorCode);
          const garmentUrl = colorOpt?.frontImage || canvasImageInfo.url;
          if (!garmentUrl) continue;

          // Resolve logo URLs for this specific color
          const colorPlacements = applyAll
            ? placementsSnap
            : placementsSnap.filter((p) => !p.variant_color || p.variant_color === colorCode);

          const logoOverlays = colorPlacements
            .filter((p) => p._logo_url && p.active)
            .map((p) => ({
              url: p._logo_url!,
              x: p.x,
              y: p.y,
              scale: p.scale,
            }));

          // Resolve text layers
          const textOverlays = textLayersSnap
            .filter((t) => t.active)
            .map((t) => ({
              text: applyTextTransform(resolveTextContent(t), t.text_transform),
              x: t.x,
              y: t.y,
              scale: t.scale,
              fontFamily: t.font_family,
              fontWeight: t.font_weight,
              fontSizePx: t.font_size_px,
              fillColor: t.fill_color,
              outlineColor: t.outline_color,
              outlineThickness: t.outline_thickness,
              letterSpacing: t.letter_spacing,
              lineHeight: t.line_height,
              alignment: t.alignment,
            }));

          // Composite and upload (fire-and-forget per color, don't block UI)
          compositeAndUploadMockup({
            garmentImageUrl: garmentUrl,
            logos: logoOverlays,
            textLayers: textOverlays,
            productId: item.id,
            colorCode,
            view: "front",
          }).then((mockupUrl) => {
            if (mockupUrl) {
              saveMockupUrl(item.id, colorCode, "front", mockupUrl).then(() => {
                queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
                queryClient.invalidateQueries({ queryKey: ["store-variant-images"] });
              });
              toast.success(`Mockup generated for ${colorOpt?.name || colorCode}`);
            }
          }).catch((err) => {
            console.error("Mockup generation failed:", err);
          });
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Copy current color's placements to other colors ──
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
  const [showCopyPanel, setShowCopyPanel] = useState(false);

  const copyToColorsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedColor || copyTargets.size === 0 || placements.length === 0) return;

      for (const targetColor of copyTargets) {
        // Delete existing placements for target color + current view
        await supabase
          .from("team_store_item_logos").delete()
          .eq("team_store_item_id", item.id)
          .eq("view", activeView)
          .eq("variant_color", targetColor);

        // Insert copies with target color
        const rows = placements.map((p, i) => ({
          team_store_item_id: item.id,
          store_logo_id: p.store_logo_id,
          store_logo_variant_id: p.store_logo_variant_id,
          position: p.position,
          x: p.x, y: p.y, scale: p.scale, rotation: p.rotation,
          is_primary: p.is_primary, role: p.role, sort_order: i,
          active: p.active, variant_color: targetColor, variant_size: null, view: activeView,
        }));
        const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-logos", item.id] });
      toast.success(`Copied to ${copyTargets.size} color${copyTargets.size > 1 ? "s" : ""}`);
      setShowCopyPanel(false);
      setCopyTargets(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Also track whether the image comes from a variant record (manageable) vs SS API
  const canvasImageInfo = useMemo(() => {
    const colorName = selectedColor
      ? colorOptions.find((c) => c.code === selectedColor)?.name
      : undefined;

    // Check variant images for this view + color first
    if (colorName) {
      const viewImg = variantImages.find(
        (img) => img.view === activeView && img.color === colorName
      );
      if (viewImg) return { url: viewImg.image_url, source: "variant" as const, variantImageId: viewImg.id };
    }
    // Check variant images for this view (any color) as fallback
    const anyViewImg = variantImages.find((img) => img.view === activeView);
    if (anyViewImg) return { url: anyViewImg.image_url, source: "variant" as const, variantImageId: anyViewImg.id };

    // SS API images (not deletable from here)
    if (selectedColor) {
      const color = colorOptions.find((c) => c.code === selectedColor);
      if (activeView === "back" && color?.backImage) return { url: color.backImage, source: "ss" as const, variantImageId: null };
      if ((activeView === "left_sleeve" || activeView === "right_sleeve") && color?.sideImage) return { url: color.sideImage, source: "ss" as const, variantImageId: null };
      if (activeView === "front" && color?.frontImage) return { url: color.frontImage, source: "ss" as const, variantImageId: null };
    }
    // For sleeves (and back without SS image), stay blank — no generic fallback
    if (activeView !== "front") return { url: "", source: "catalog" as const, variantImageId: null };
    // Fallback only for front view
    const fallback = item.primary_image_url || item.catalog_styles?.style_image || "";
    return { url: fallback, source: "catalog" as const, variantImageId: null };
  }, [selectedColor, colorOptions, item.primary_image_url, item.catalog_styles?.style_image, activeView, variantImages]);

  const canvasImage = canvasImageInfo.url;

  const isSleeveView = activeView === "left_sleeve" || activeView === "right_sleeve";
  const activeViewLabel = activeView === "front" ? "Front" : activeView === "back" ? "Back"
    : activeView === "left_sleeve" ? "Left Sleeve" : "Right Sleeve";

  // Handle view image upload (works for any view, not just sleeves)
  const viewImageFileRef = useRef<HTMLInputElement>(null);
  const [viewImageUploading, setViewImageUploading] = useState(false);

  const handleViewImageUpload = useCallback(async (file: File) => {
    const colorName = selectedColor
      ? colorOptions.find((c) => c.code === selectedColor)?.name
      : null;
    if (!colorName) {
      toast.error("Please select a color first");
      return;
    }

    setViewImageUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${storeId}/${item.id}/variants/${colorName.replace(/\s+/g, "-")}/${activeView}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("store-product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("store-product-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      if (reuseSleeveForAllColors) {
        // Insert for ALL enabled colors
        const enabledColors = colorOptions.map((c) => c.name);
        const rows = enabledColors.map((cn) => ({
          team_store_product_id: item.id,
          color: cn,
          image_url: imageUrl,
          image_type: "flat",
          view: activeView,
          is_primary: false,
          sort_order: 0,
        }));
        const { error } = await supabase
          .from("team_store_product_variant_images")
          .insert(rows as any);
        if (error) throw error;
        toast.success(`${activeViewLabel} image applied to all ${enabledColors.length} colors`);
      } else {
        const { error } = await supabase
          .from("team_store_product_variant_images")
          .insert({
            team_store_product_id: item.id,
            color: colorName,
            image_url: imageUrl,
            image_type: "flat",
            view: activeView,
            is_primary: false,
            sort_order: 0,
          } as any);
        if (error) throw error;
        toast.success(`${activeViewLabel} image uploaded for ${colorName}`);
      }

      queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setViewImageUploading(false);
    }
  }, [selectedColor, colorOptions, storeId, item.id, activeView, reuseSleeveForAllColors, activeViewLabel, queryClient]);

  // Handle deleting a variant image for this view
  const handleDeleteViewImage = useCallback(async () => {
    const colorName = selectedColor
      ? colorOptions.find((c) => c.code === selectedColor)?.name
      : null;

    // Delete all variant images for this view + color (or all colors if reuse is on)
    try {
      if (reuseSleeveForAllColors) {
        const { error } = await supabase
          .from("team_store_product_variant_images")
          .delete()
          .eq("team_store_product_id", item.id)
          .eq("view", activeView);
        if (error) throw error;
        toast.success(`${activeViewLabel} image removed for all colors`);
      } else if (colorName) {
        const { error } = await supabase
          .from("team_store_product_variant_images")
          .delete()
          .eq("team_store_product_id", item.id)
          .eq("view", activeView)
          .eq("color", colorName);
        if (error) throw error;
        toast.success(`${activeViewLabel} image removed for ${colorName}`);
      }
      queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  }, [selectedColor, colorOptions, item.id, activeView, reuseSleeveForAllColors, activeViewLabel, queryClient]);

  // Keep sleeve upload handler for PlacementCanvas empty-state upload prompt
  const handleSleeveUpload = isSleeveView ? handleViewImageUpload : undefined;
  const sleeveUploading = viewImageUploading;
  const sleeveViewLabel = activeViewLabel;

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
      <div className="flex-1 space-y-4 pb-20">

        {/* ─── Store Logo Picker ─── */}
        <StoreLogoPicker
          storeLogos={storeLogos}
          assignedLogoIds={assignedLogoIds}
          onAdd={addLogoToProduct}
        />

        {/* ─── Variant Selector ─── */}
        {colorOptions.length > 0 && (
          <div className="border rounded-lg p-3 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Variant Preview</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={applyToAllColors}
                  onCheckedChange={(v) => {
                    applyModeUserSetRef.current = true;
                    setApplyToAllColors(v);
                    setDirty(true);
                    if (existingPlacements) {
                      const all = JSON.parse(savedSnapshot) as LogoPlacement[];
                      setPlacements(filterPlacementsForEditing(all, selectedColor, v, activeView));
                    }
                  }}
                />
                <Label className="text-xs text-muted-foreground">
                  {applyToAllColors ? "Apply to all colors" : "This color only"}
                </Label>
              </div>
            </div>

            {/* Color swatches */}
            <div className="flex flex-wrap gap-1.5">
              {colorOptions.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setSelectedColor(c.code);
                    setActivePlacementIdx(null);
                    // The useEffect on selectedColor handles re-filtering + variant re-pick
                  }}
                  className={`relative flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${
                    selectedColor === c.code
                      ? "border-accent bg-accent/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                  title={c.name}
                >
                  {c.swatchImage ? (
                    <img src={c.swatchImage} alt={c.name} className="w-4 h-4 rounded-sm border shrink-0" />
                  ) : c.color1 ? (
                    <span
                      className="w-4 h-4 rounded-sm border shrink-0"
                      style={{
                        background: c.color2
                          ? `linear-gradient(135deg, ${c.color1} 50%, ${c.color2} 50%)`
                          : c.color1,
                      }}
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-sm bg-muted border shrink-0" />
                  )}
                  <span className="truncate max-w-[80px]">{c.name}</span>
                  {!applyToAllColors && selectedColor === c.code && (
                    <Badge variant="secondary" className="text-[8px] px-1 h-3.5">editing</Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Copy to other colors button */}
            {!applyToAllColors && selectedColor && placements.length > 0 && colorOptions.length > 1 && (
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => {
                    setShowCopyPanel(!showCopyPanel);
                    if (!showCopyPanel) setCopyTargets(new Set());
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy to other colors
                </Button>

                {showCopyPanel && (
                  <div className="border rounded-md p-2.5 bg-muted/30 space-y-2">
                    <p className="text-[10px] text-muted-foreground">
                      Copy current <strong>{colorOptions.find(c => c.code === selectedColor)?.name}</strong> placements to:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {colorOptions.filter(c => c.code !== selectedColor).map(c => (
                        <label
                          key={c.code}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border cursor-pointer transition-colors ${
                            copyTargets.has(c.code) ? "border-accent bg-accent/10" : "border-border hover:bg-muted"
                          }`}
                        >
                          <Checkbox
                            checked={copyTargets.has(c.code)}
                            onCheckedChange={(v) => {
                              setCopyTargets(prev => {
                                const next = new Set(prev);
                                if (v) next.add(c.code);
                                else next.delete(c.code);
                                return next;
                              });
                            }}
                            className="h-3 w-3"
                          />
                          {c.swatchImage ? (
                            <img src={c.swatchImage} alt={c.name} className="w-3.5 h-3.5 rounded-sm border shrink-0" />
                          ) : c.color1 ? (
                            <span className="w-3.5 h-3.5 rounded-sm border shrink-0" style={{ background: c.color1 }} />
                          ) : null}
                          <span className="truncate max-w-[70px]">{c.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => setCopyTargets(new Set(colorOptions.filter(c => c.code !== selectedColor).map(c => c.code)))}
                      >
                        Select all
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px]"
                        disabled={copyTargets.size === 0 || copyToColorsMutation.isPending}
                        onClick={() => copyToColorsMutation.mutate()}
                      >
                        {copyToColorsMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Copy className="w-3 h-3 mr-1" />}
                        Copy to {copyTargets.size} color{copyTargets.size !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingVariants && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading colors…
              </div>
            )}
          </div>
        )}

        {/* ─── View Toggle (Front / Back / L Sleeve / R Sleeve) ─── */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">View:</Label>
          <div className="flex rounded-lg border overflow-hidden">
            {([
              { key: "front", label: "Front" },
              { key: "back", label: "Back" },
              { key: "left_sleeve", label: "L Sleeve" },
              { key: "right_sleeve", label: "R Sleeve" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveView(key);
                  setActivePlacementIdx(null);
                  if (existingPlacements) {
                    const all = JSON.parse(savedSnapshot) as LogoPlacement[];
                    const hasColorOverrides = all.some((p) => p.variant_color != null);
                    setPlacements(filterPlacementsForEditing(all, selectedColor, !hasColorOverrides, key));
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeView === key
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reuse checkbox moved into image management strip below canvas */}

        {/* ─── Canvas + Controls Side-by-Side ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Left: Canvas */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Placement Canvas — {activeViewLabel}</Label>
            <PlacementCanvas
              image={canvasImage}
              placements={placements}
              textLayers={textLayers}
              presetMap={presetMap}
              activeIdx={activePlacementIdx}
              activeTextIdx={activeTextIdx}
              maxScaleFn={getMaxScale}
              onSelectPlacement={(idx) => { setActivePlacementIdx(idx >= 0 ? idx : null); if (idx >= 0) setActiveTextIdx(null); }}
              onMovePlacement={(idx, x, y) => updatePlacement(idx, { x, y })}
              onScalePlacement={(idx, scale) => updatePlacement(idx, { scale })}
              onDeletePlacement={removePlacement}
              onSelectTextLayer={(idx) => { setActiveTextIdx(idx >= 0 ? idx : null); if (idx >= 0) setActivePlacementIdx(null); }}
              onMoveTextLayer={(idx, x, y) => updateTextLayer(idx, { x, y })}
              onScaleTextLayer={(idx, scale) => updateTextLayer(idx, { scale })}
              onDeleteTextLayer={removeTextLayer}
              onUploadSleeveImage={isSleeveView ? handleSleeveUpload : undefined}
              sleeveUploading={sleeveUploading}
              sleeveViewLabel={sleeveViewLabel}
            />

            {/* ─── View Image Management ─── */}
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={viewImageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleViewImageUpload(f);
                  e.target.value = "";
                }}
              />
              {canvasImageInfo.source === "variant" ? (
                <>
                  <Badge variant="secondary" className="text-[10px]">Custom image</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={viewImageUploading}
                    onClick={() => viewImageFileRef.current?.click()}
                  >
                    {viewImageUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Replace className="w-3 h-3 mr-1" />}
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={handleDeleteViewImage}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </>
              ) : canvasImageInfo.source === "ss" ? (
                <>
                  <Badge variant="secondary" className="text-[10px]">Catalog image</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={viewImageUploading}
                    onClick={() => viewImageFileRef.current?.click()}
                  >
                    {viewImageUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                    Upload Custom Image
                  </Button>
                </>
              ) : canvasImage ? (
                <>
                  <Badge variant="secondary" className="text-[10px]">Fallback image</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={viewImageUploading}
                    onClick={() => viewImageFileRef.current?.click()}
                  >
                    {viewImageUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                    Upload {activeViewLabel} Image
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={viewImageUploading}
                  onClick={() => viewImageFileRef.current?.click()}
                >
                  {viewImageUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  Upload {activeViewLabel} Image
                </Button>
              )}
              {colorOptions.length > 1 && (
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
                  <Checkbox
                    checked={reuseSleeveForAllColors}
                    onCheckedChange={(v) => setReuseSleeveForAllColors(!!v)}
                    className="h-3.5 w-3.5"
                  />
                  Apply to all colors
                </label>
              )}
            </div>
          </div>

          {/* Right: Placement controls panel */}
          <div className="space-y-4 lg:sticky lg:top-4">
            {/* Active placement controls */}
            {active && activePlacementIdx !== null ? (
              <div className="border rounded-lg p-4 bg-card space-y-4">
                <div className="flex items-center gap-3">
                  {active._logo_url && (
                    <img src={active._logo_url} alt="" className="w-14 h-14 object-contain rounded bg-muted border p-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold truncate">{active._logo_name || "Logo"}</p>
                    <p className="text-sm text-muted-foreground">
                      {presetMap.get(active.position)?.label || active.position}
                    </p>
                  </div>
                  {active.is_primary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removePlacement(activePlacementIdx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Logo select */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-medium">Logo</Label>
                    <Select value={active.store_logo_id} onValueChange={(v) => {
                      const logo = storeLogos.find((l) => l.id === v);
                      const variants = variantsByLogo.get(v) || [];
                      // Use default variant, not auto-picked by garment color
                      const defaultVariant = variants.find((vr) => vr.is_default) || variants[0] || null;
                        updatePlacement(activePlacementIdx, {
                          store_logo_id: v,
                          store_logo_variant_id: defaultVariant?.id || null,
                          _logo_url: defaultVariant?.file_url || logo?.file_url,
                          variant_locked: true,
                        });
                    }}>
                      <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
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

                  <div className="grid grid-cols-2 gap-3">
                    {/* Placement Preset */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">Placement</Label>
                      <Select value={active.position} onValueChange={(v) => applyPreset(activePlacementIdx, v)}>
                        <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
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

                    {/* Role selector */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">Role</Label>
                      <Select value={active.role} onValueChange={(v) => updatePlacement(activePlacementIdx, { role: v })}>
                        <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[
                            { value: "primary", label: "Primary" },
                            { value: "secondary", label: "Secondary" },
                            { value: "sponsor", label: "Sponsor" },
                            { value: "league_patch", label: "League Patch" },
                            { value: "number_zone", label: "Number Zone" },
                            { value: "other", label: "Other" },
                          ].map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Logo Variant for this shirt color */}
                  {(() => {
                    const variants = variantsByLogo.get(active.store_logo_id) || [];
                    if (variants.length === 0) return null;
                    const currentColorName = !applyToAllColors && selectedColor
                      ? colorOptions.find((c) => c.code === selectedColor)?.name
                      : null;
                    return (
                      <div className="space-y-1 p-2 bg-accent/5 rounded-lg border border-accent/20">
                        <Label className="text-xs font-semibold text-accent">
                          Logo Variant{currentColorName ? ` for ${currentColorName} shirt` : ""}
                        </Label>
                        {variants.length === 1 ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <img src={variants[0].file_url} alt="" className="w-5 h-5 object-contain" />
                            {variants[0].name}
                            <span className="capitalize text-[10px]">({variants[0].colorway})</span>
                          </div>
                        ) : (
                          <Select
                            value={active.store_logo_variant_id || ""}
                            onValueChange={(v) => {
                              const variant = variants.find((vr) => vr.id === v);
                              updatePlacement(activePlacementIdx, {
                                store_logo_variant_id: v,
                                _logo_url: variant?.file_url || active._logo_url,
                                variant_locked: true,
                              });
                            }}
                          >
                            <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Choose variant for this color" /></SelectTrigger>
                            <SelectContent>
                              {variants.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  <span className="flex items-center gap-2">
                                    <img src={v.file_url} alt="" className="w-5 h-5 object-contain" />
                                    {v.name}
                                    <span className="text-muted-foreground capitalize text-[10px]">({v.colorway})</span>
                                    {v.is_default && <span className="text-[9px] text-muted-foreground">[Default]</span>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Scale readout */}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Scale: {Math.round(active.scale * 100)}%</span>
                  <span>max {Math.round(getMaxScale(active.position) * 100)}%</span>
                </div>

                {/* Primary + Active toggles + debug coords */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={active.is_primary} onCheckedChange={() => setPrimaryPlacement(activePlacementIdx)} />
                      <Label className="text-xs">Primary</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={active.active} onCheckedChange={(v) => updatePlacement(activePlacementIdx, { active: v })} />
                      <Label className="text-xs">Active</Label>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    x:{active.x.toFixed(2)} y:{active.y.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Click a logo on the canvas to edit its placement</p>
              </div>
            )}

            {/* Assigned Logos list - moved into right panel */}
            {placements.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Logos ({placements.length})</Label>
                <div className="flex flex-wrap gap-1.5">
                  {placements.map((p, idx) => {
                    const usage = getUsageLabel(p.store_logo_id);
                    return (
                      <button
                        key={idx}
                        onClick={() => setActivePlacementIdx(idx)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-colors ${
                          !p.active ? "opacity-40" : ""
                        } ${
                          activePlacementIdx === idx
                            ? "border-accent bg-accent/10 text-accent-foreground font-medium"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {p._logo_url && <img src={p._logo_url} alt="" className="w-3.5 h-3.5 object-contain rounded" />}
                        <span className="truncate max-w-[70px]">{p._logo_name || "Logo"}</span>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize">{p.role}</Badge>
                        {p.is_primary && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">★</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>




        {/* ─── Add Text Button ─── */}
        <div className="border rounded-lg p-3 bg-card space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Text Layers ({textLayers.length})
            </Label>
            <div className="flex gap-1">
              {(["static_text", "personalization_name", "personalization_number", "name_number_template"] as TextLayerSource[]).map((src) => (
                <Button
                  key={src}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => addTextLayer(src)}
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  {TEXT_SOURCE_LABELS[src]}
                </Button>
              ))}
            </div>
          </div>

          {/* Text layer list */}
          {textLayers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {textLayers.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveTextIdx(idx); setActivePlacementIdx(null); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                    !t.active ? "opacity-40" : ""
                  } ${
                    activeTextIdx === idx
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Type className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{TEXT_SOURCE_LABELS[t.source]}</span>
                  <span
                    className="w-3 h-3 rounded-sm border shrink-0"
                    style={{ backgroundColor: t.fill_color }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Active Text Layer Panel ─── */}
        {activeTextIdx !== null && textLayers[activeTextIdx] && (
          <TextLayerPanel
            layer={textLayers[activeTextIdx]}
            idx={activeTextIdx}
            onUpdate={updateTextLayer}
            onDelete={removeTextLayer}
          />
        )}

        {placements.length === 0 && textLayers.length === 0 && (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No logos or text assigned yet. Pick a logo from the library above or add a text layer.</p>
          </div>
        )}
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t py-3 px-1 -mx-1 flex items-center gap-3 z-20">
        {anyDirty && (
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
          disabled={!anyDirty || saveMutation.isPending}
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() =>
            saveMutation.mutate({
              view: activeView,
              applyToAllColors,
              selectedColor,
              placements: placements.map((p) => ({ ...p })),
              textLayers: textLayers.map((t) => ({ ...t })),
            })
          }
          disabled={!anyDirty || saveMutation.isPending}
        >
          {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          <Save className="w-3 h-3 mr-1" /> Save Placements
        </Button>
      </div>
    </div>
  );
}
