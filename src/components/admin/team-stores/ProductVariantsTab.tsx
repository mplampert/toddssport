import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Palette, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ColorOption {
  code: string;
  name: string;
  swatchImage?: string;
  color1?: string;
  color2?: string;
  sizes: SizeOption[];
}

interface SizeOption {
  name: string;
  sku: string;
  piecePrice?: number;
  qty?: number;
}

/** Stored per-color selection with optional excluded sizes */
interface ColorSelection {
  code: string;
  name: string;
  excludedSizes?: string[];
}

interface Props {
  item: {
    id: string;
    style_id: number;
    allowed_colors: any;
    catalog_styles?: { style_id: number } | null;
  };
  storeId: string;
}

const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

function sortSizes(sizes: SizeOption[]): SizeOption[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.name);
    const bi = SIZE_ORDER.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function ProductVariantsTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const ssStyleId = item.catalog_styles?.style_id ?? item.style_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [expandedColor, setExpandedColor] = useState<string | null>(null);

  // Parse existing allowed_colors (supports old format without excludedSizes)
  const initialSelections: ColorSelection[] = useMemo(() => {
    if (!Array.isArray(item.allowed_colors)) return [];
    return item.allowed_colors.map((c: any) => ({
      code: c.code,
      name: c.name,
      excludedSizes: Array.isArray(c.excludedSizes) ? c.excludedSizes : [],
    }));
  }, [item.allowed_colors]);

  const [selections, setSelections] = useState<ColorSelection[]>(initialSelections);
  const [dirty, setDirty] = useState(false);

  // Fetch color/size variants from S&S API
  useEffect(() => {
    let cancelled = false;
    async function fetchVariants() {
      setLoading(true);
      setError(null);
      try {
        const products = await getProducts({ style: ssStyleId });
        if (cancelled) return;

        const colorMap = new Map<string, ColorOption>();
        products.forEach((sp: SSProduct) => {
          if (!sp.colorName) return;
          const existing = colorMap.get(sp.colorCode);
          if (existing) {
            existing.sizes.push({
              name: sp.sizeName,
              sku: sp.sku || "",
              piecePrice: sp.piecePrice,
              qty: sp.qty,
            });
          } else {
            colorMap.set(sp.colorCode, {
              code: sp.colorCode,
              name: sp.colorName,
              swatchImage: sp.colorSwatchImage,
              color1: sp.color1,
              color2: sp.color2,
              sizes: [{ name: sp.sizeName, sku: sp.sku || "", piecePrice: sp.piecePrice, qty: sp.qty }],
            });
          }
        });

        setColorOptions(Array.from(colorMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load variants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVariants();
    return () => { cancelled = true; };
  }, [ssStyleId]);

  // Helpers
  const getSelection = (code: string) => selections.find((s) => s.code === code);
  const isColorSelected = (code: string) => selections.some((s) => s.code === code);

  const isSizeEnabled = (colorCode: string, sizeName: string) => {
    const sel = getSelection(colorCode);
    if (!sel) return false; // color not selected → size not available
    return !(sel.excludedSizes || []).includes(sizeName);
  };

  const toggleColor = (c: ColorOption) => {
    setSelections((prev) => {
      const exists = prev.some((s) => s.code === c.code);
      if (exists) return prev.filter((s) => s.code !== c.code);
      return [...prev, { code: c.code, name: c.name, excludedSizes: [] }];
    });
    setDirty(true);
  };

  const toggleSize = (colorCode: string, sizeName: string) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.code !== colorCode) return s;
        const excluded = s.excludedSizes || [];
        const isExcluded = excluded.includes(sizeName);
        return {
          ...s,
          excludedSizes: isExcluded
            ? excluded.filter((n) => n !== sizeName)
            : [...excluded, sizeName],
        };
      })
    );
    setDirty(true);
  };

  const selectAll = () => {
    setSelections(colorOptions.map((c) => ({ code: c.code, name: c.name, excludedSizes: [] })));
    setDirty(true);
  };

  const clearAll = () => {
    setSelections([]);
    setDirty(true);
  };

  const enableAllSizes = (colorCode: string) => {
    setSelections((prev) => prev.map((s) => s.code === colorCode ? { ...s, excludedSizes: [] } : s));
    setDirty(true);
  };

  const disableAllSizes = (colorCode: string, sizes: SizeOption[]) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.code === colorCode ? { ...s, excludedSizes: sizes.map((sz) => sz.name) } : s
      )
    );
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = selections.length > 0 ? selections : null;
      const { error } = await supabase
        .from("team_store_products")
        .update({ allowed_colors: payload as any })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Variant selections saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Stats
  const totalEnabledSizes = useMemo(() => {
    let count = 0;
    for (const sel of selections) {
      const co = colorOptions.find((c) => c.code === sel.code);
      if (!co) continue;
      count += co.sizes.length - (sel.excludedSizes?.length || 0);
    }
    return count;
  }, [selections, colorOptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading variants from catalog…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (colorOptions.length === 0) {
    return (
      <div className="text-center py-8">
        <Palette className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No color/size data available for this product.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selections.length === 0
            ? "No filter — all variants show on storefront"
            : `${selections.length} colors, ${totalEnabledSizes} sizes enabled`}
        </p>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={selectAll}>
            <Check className="w-3 h-3 mr-1" /> All
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={clearAll}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {/* Color list with per-size toggles */}
      <div className="space-y-1">
        {colorOptions.map((c) => {
          const selected = isColorSelected(c.code);
          const isExpanded = expandedColor === c.code;
          const sel = getSelection(c.code);
          const excludedCount = sel?.excludedSizes?.length || 0;
          const enabledSizeCount = selected ? c.sizes.length - excludedCount : 0;
          const sortedSizes = sortSizes(c.sizes);

          return (
            <div key={c.code} className="border rounded-md overflow-hidden">
              {/* Color row */}
              <div
                className={`flex items-center gap-2 px-2.5 py-2 transition-colors ${
                  selected ? "bg-accent/10" : "hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleColor(c)}
                  className="shrink-0"
                />
                {c.swatchImage ? (
                  <img src={c.swatchImage} alt={c.name} className="w-5 h-5 rounded-sm border shrink-0" />
                ) : c.color1 ? (
                  <span
                    className="w-5 h-5 rounded-sm border shrink-0"
                    style={{
                      background: c.color2
                        ? `linear-gradient(135deg, ${c.color1} 50%, ${c.color2} 50%)`
                        : c.color1,
                    }}
                  />
                ) : (
                  <span className="w-5 h-5 rounded-sm bg-muted border shrink-0" />
                )}
                <span className="text-xs flex-1 truncate">{c.name}</span>
                {selected && excludedCount > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 shrink-0 border-amber-300 text-amber-700">
                    {enabledSizeCount}/{c.sizes.length} sizes
                  </Badge>
                )}
                {selected && excludedCount === 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0">
                    {c.sizes.length} sizes
                  </Badge>
                )}
                {!selected && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0 opacity-50">
                    {c.sizes.length} sizes
                  </Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedColor(isExpanded ? null : c.code);
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded: per-size toggles */}
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                  {!selected && (
                    <p className="text-[10px] text-amber-600">
                      Enable this color first to manage individual sizes.
                    </p>
                  )}
                  {selected && (
                    <>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 px-1.5" onClick={() => enableAllSizes(c.code)}>
                          <Check className="w-2.5 h-2.5 mr-0.5" /> All Sizes
                        </Button>
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 px-1.5" onClick={() => disableAllSizes(c.code, c.sizes)}>
                          <X className="w-2.5 h-2.5 mr-0.5" /> None
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {/* Header */}
                        <div className="grid grid-cols-[24px_1fr_80px_60px] gap-x-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider pb-1">
                          <span />
                          <span>Size</span>
                          <span>SKU</span>
                          <span className="text-right">Price</span>
                        </div>
                        {sortedSizes.map((s) => {
                          const sizeEnabled = isSizeEnabled(c.code, s.name);
                          return (
                            <div
                              key={s.sku || s.name}
                              className={`grid grid-cols-[24px_1fr_80px_60px] gap-x-3 items-center py-1 rounded px-0.5 ${
                                sizeEnabled ? "" : "opacity-50"
                              }`}
                            >
                              <Checkbox
                                checked={sizeEnabled}
                                onCheckedChange={() => toggleSize(c.code, s.name)}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs">{s.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate">{s.sku || "—"}</span>
                              <span className="text-xs text-right tabular-nums">
                                {s.piecePrice ? `$${s.piecePrice.toFixed(2)}` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
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
          <Save className="w-3 h-3 mr-1" /> Save Variant Selections
        </Button>
      )}
    </div>
  );
}
