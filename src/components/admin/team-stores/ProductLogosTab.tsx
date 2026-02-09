import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Save, Loader2, ImageIcon, RotateCcw, AlertCircle, Upload, Replace } from "lucide-react";
import { toast } from "sonner";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { PlacementCanvas, type DecorationPlacement, type LogoPlacement } from "./PlacementCanvas";
import { StoreLogoPicker, type StoreLogo } from "./StoreLogoPicker";
import { pickBestVariant, type LogoVariantOption } from "@/lib/logoVariantPicker";
import { useProductVariantImages, type VariantImage } from "@/hooks/useVariantImages";

/* ─── Types ─── */

interface ColorOption {
  code: string;
  name: string;
  frontImage?: string;
  backImage?: string;
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
  const [applyToAllColors, setApplyToAllColors] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [activeView, setActiveView] = useState<"front" | "back" | "left_sleeve" | "right_sleeve">("front");
  const [reuseSleeveForAllColors, setReuseSleeveForAllColors] = useState(true);

  // ── Placement state ──
  const [placements, setPlacements] = useState<LogoPlacement[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activePlacementIdx, setActivePlacementIdx] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");

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

    const all = existingPlacements.map((p: any) => ({
      id: p.id,
      store_logo_id: p.store_logo_id,
      store_logo_variant_id: p.store_logo_variant_id,
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
      _logo_url: p.store_logos?.file_url,
    }));

    const hasColorOverrides = all.some((p: LogoPlacement) => p.variant_color != null);
    setApplyToAllColors(!hasColorOverrides);

    let filtered = filterPlacementsForEditing(all, selectedColor, !hasColorOverrides, activeView);

    // Auto-pick best logo variant for the current garment color
    const garmentColor = selectedColor
      ? colorOptions.find((c) => c.code === selectedColor)?.color1
      : undefined;
    if (garmentColor) {
      filtered = filtered.map((p) => {
        const variants = variantsByLogo.get(p.store_logo_id) || [];
        if (variants.length <= 1) return p;
        const best = pickBestVariant(variants, garmentColor);
        if (best && best.id !== p.store_logo_variant_id) {
          return { ...p, store_logo_variant_id: best.id, _logo_url: best.file_url };
        }
        return p;
      });
    }

    setPlacements(filtered);
    setSavedSnapshot(JSON.stringify(all));
    setDirty(false);
    setActivePlacementIdx(null);
  }, [existingPlacements, selectedColor, activeView, colorOptions, variantsByLogo]);

  function filterPlacementsForEditing(all: LogoPlacement[], color: string | null, allColors: boolean, view: string): LogoPlacement[] {
    // Filter by view first
    const viewFiltered = all.filter((p) => (p.view || "front") === view);
    if (allColors) {
      return viewFiltered.filter((p) => !p.variant_color);
    }
    const colorSpecific = viewFiltered.filter((p) => p.variant_color === color);
    if (colorSpecific.length > 0) return colorSpecific;
    return viewFiltered.filter((p) => !p.variant_color).map((p) => ({
      ...p,
      id: undefined,
      variant_color: color,
    }));
  }

  // Add a store logo to this product with default placement + auto-pick variant
  const addLogoToProduct = (logo: StoreLogo) => {
    const defaultPresetCode = activeView === "back" ? "upper_back"
      : activeView === "left_sleeve" ? "left_sleeve"
      : activeView === "right_sleeve" ? "right_sleeve"
      : "left_chest";
    const defaultPreset = presets.find((p) => p.code === defaultPresetCode) || presets[0];
    const logoVariants = variantsByLogo.get(logo.id) || [];
    const garmentColor = selectedColor
      ? colorOptions.find((c) => c.code === selectedColor)?.color1
      : undefined;
    const bestVariant = pickBestVariant(logoVariants, garmentColor);

    setPlacements((prev) => [
      ...prev,
      {
        store_logo_id: logo.id,
        store_logo_variant_id: bestVariant?.id || null,
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
        _logo_url: bestVariant?.file_url || logo.file_url,
      },
    ]);
    setActivePlacementIdx(placements.length);
    setDirty(true);
    toast.success(`Added "${logo.name}" to ${activeView} view — adjust placement on the canvas`);
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
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save only placements for the current view — delete existing for this view + color scope, then insert
      if (applyToAllColors) {
        // Delete all placements for this view (all colors)
        await supabase.from("team_store_item_logos").delete()
          .eq("team_store_item_id", item.id)
          .eq("view", activeView);
        if (placements.length > 0) {
          const rows = placements.map((p, i) => ({
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
            view: activeView,
          }));
          const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
          if (error) throw error;
        }
      } else {
        // Delete placements for this view + specific color
        const { error: delErr } = await supabase
          .from("team_store_item_logos")
          .delete()
          .eq("team_store_item_id", item.id)
          .eq("view", activeView)
          .or(`variant_color.eq.${selectedColor},variant_color.is.null`);
        if (delErr) throw delErr;

        if (placements.length > 0) {
          const rows = placements.map((p, i) => ({
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
            variant_color: selectedColor,
            variant_size: null,
            view: activeView,
          }));
          const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-logos", item.id] });
      queryClient.invalidateQueries({ queryKey: ["store-logos", storeId] });
      queryClient.invalidateQueries({ queryKey: ["storefront-product-logos"] });
      queryClient.invalidateQueries({ queryKey: ["ts-product-detail"] });
      toast.success("Logo placements saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Determine canvas image based on selected color + active view
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

        {/* ─── Placement Canvas ─── */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Placement Canvas — {activeViewLabel}</Label>
          <PlacementCanvas
            image={canvasImage}
            placements={placements}
            presetMap={presetMap}
            activeIdx={activePlacementIdx}
            maxScaleFn={getMaxScale}
            onSelectPlacement={setActivePlacementIdx}
            onMovePlacement={(idx, x, y) => updatePlacement(idx, { x, y })}
            onScalePlacement={(idx, scale) => updatePlacement(idx, { scale })}
            onDeletePlacement={removePlacement}
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

            <div className="grid grid-cols-3 gap-3">
              {/* Logo select */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Logo</Label>
                <Select value={active.store_logo_id} onValueChange={(v) => {
                  const logo = storeLogos.find((l) => l.id === v);
                  const variants = variantsByLogo.get(v) || [];
                  const garmentColor = selectedColor
                    ? colorOptions.find((c) => c.code === selectedColor)?.color1
                    : undefined;
                  const best = pickBestVariant(variants, garmentColor);
                  updatePlacement(activePlacementIdx, {
                    store_logo_id: v,
                    store_logo_variant_id: best?.id || null,
                    _logo_url: best?.file_url || logo?.file_url,
                  });
                }}>
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

              {/* Role selector */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Role</Label>
                <Select value={active.role} onValueChange={(v) => updatePlacement(activePlacementIdx, { role: v })}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
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

            {/* Logo Variant selector */}
            {(() => {
              const variants = variantsByLogo.get(active.store_logo_id) || [];
              if (variants.length <= 1) return null;
              return (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Logo Variant</Label>
                  <Select
                    value={active.store_logo_variant_id || ""}
                    onValueChange={(v) => {
                      const variant = variants.find((vr) => vr.id === v);
                      updatePlacement(activePlacementIdx, {
                        store_logo_variant_id: v,
                        _logo_url: variant?.file_url || active._logo_url,
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select variant" /></SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-2">
                            <img src={v.file_url} alt="" className="w-4 h-4 object-contain" />
                            {v.name}
                            <span className="text-muted-foreground capitalize text-[10px]">({v.colorway})</span>
                            {v.is_default && <span className="text-[9px] text-muted-foreground">[Default]</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            {/* Scale readout */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Scale: {Math.round(active.scale * 100)}%</span>
              <span>max {Math.round(getMaxScale(active.position) * 100)}%</span>
            </div>

            {/* Primary + Active toggles + debug coords */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={active.is_primary} onCheckedChange={() => setPrimaryPlacement(activePlacementIdx)} />
                  <Label className="text-[11px]">Primary</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={active.active} onCheckedChange={(v) => updatePlacement(activePlacementIdx, { active: v })} />
                  <Label className="text-[11px]">Active</Label>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                x:{active.x.toFixed(2)} y:{active.y.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ─── Assigned Logos list ─── */}
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
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                      !p.active ? "opacity-40" : ""
                    } ${
                      activePlacementIdx === idx
                        ? "border-accent bg-accent/10 text-accent-foreground font-medium"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p._logo_url && <img src={p._logo_url} alt="" className="w-4 h-4 object-contain rounded" />}
                    <span className="truncate max-w-[100px]">{p._logo_name || "Logo"}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize">{p.role}</Badge>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstView = getFirstView(p.store_logo_id);
                        if (firstView && firstView !== activeView) {
                          setActiveView(firstView);
                          setActivePlacementIdx(null);
                          if (existingPlacements) {
                            const all = JSON.parse(savedSnapshot) as LogoPlacement[];
                            const hasColorOverrides = all.some((pl) => pl.variant_color != null);
                            setPlacements(filterPlacementsForEditing(all, selectedColor, !hasColorOverrides, firstView));
                          }
                        }
                      }}
                      className={`text-[8px] px-1.5 py-0 h-3.5 inline-flex items-center rounded-full cursor-pointer ${
                        usage === "Not placed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent-foreground hover:bg-accent/20"
                      }`}
                      title="Click to jump to first view"
                    >
                      {usage}
                    </span>
                    {p.is_primary && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">★</Badge>}
                    {!p.active && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">Off</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {placements.length === 0 && (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No logos assigned yet. Pick one from the library above.</p>
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
