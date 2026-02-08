import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Palette, Save } from "lucide-react";
import { toast } from "sonner";

interface ColorOption {
  code: string;
  name: string;
  swatchImage?: string;
  color1?: string;
  color2?: string;
  sizes: { name: string; sku: string; piecePrice?: number; qty?: number }[];
}

interface ColorSelection {
  code: string;
  name: string;
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

export function ProductVariantsTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const ssStyleId = item.catalog_styles?.style_id ?? item.style_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [expandedColor, setExpandedColor] = useState<string | null>(null);

  // Parse existing allowed_colors
  const initialAllowed: ColorSelection[] = useMemo(() => {
    if (Array.isArray(item.allowed_colors)) return item.allowed_colors;
    return [];
  }, [item.allowed_colors]);

  const [selectedColors, setSelectedColors] = useState<ColorSelection[]>(initialAllowed);
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
              sizes: [{
                name: sp.sizeName,
                sku: sp.sku || "",
                piecePrice: sp.piecePrice,
                qty: sp.qty,
              }],
            });
          }
        });

        const sorted = Array.from(colorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setColorOptions(sorted);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load variants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVariants();
    return () => { cancelled = true; };
  }, [ssStyleId]);

  const isColorSelected = (code: string) => selectedColors.some((c) => c.code === code);

  const toggleColor = (color: ColorOption) => {
    setSelectedColors((prev) => {
      const exists = prev.some((c) => c.code === color.code);
      return exists
        ? prev.filter((c) => c.code !== color.code)
        : [...prev, { code: color.code, name: color.name }];
    });
    setDirty(true);
  };

  const selectAll = () => {
    setSelectedColors(colorOptions.map((c) => ({ code: c.code, name: c.name })));
    setDirty(true);
  };

  const clearAll = () => {
    setSelectedColors([]);
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({ allowed_colors: selectedColors.length > 0 ? (selectedColors as any) : null })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Color selections saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
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
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedColors.length === 0
            ? "No filter — all colors show on storefront"
            : `${selectedColors.length} of ${colorOptions.length} colors selected`}
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

      {/* Color list */}
      <div className="space-y-1">
        {colorOptions.map((c) => {
          const selected = isColorSelected(c.code);
          const isExpanded = expandedColor === c.code;
          return (
            <div key={c.code} className="border rounded-md overflow-hidden">
              <div
                className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors ${
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
                <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0">
                  {c.sizes.length} {c.sizes.length === 1 ? "size" : "sizes"}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedColor(isExpanded ? null : c.code);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                >
                  {isExpanded ? "▲" : "▼"}
                </button>
              </div>

              {/* Size detail row */}
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2">
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px]">
                    <span className="font-medium text-muted-foreground uppercase tracking-wider">Size</span>
                    <span className="font-medium text-muted-foreground uppercase tracking-wider">SKU</span>
                    <span className="font-medium text-muted-foreground uppercase tracking-wider text-right">Price</span>
                    {c.sizes
                      .sort((a, b) => {
                        const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
                        return (order.indexOf(a.name) ?? 99) - (order.indexOf(b.name) ?? 99);
                      })
                      .map((s, i) => (
                        <React.Fragment key={i}>
                          <span className="text-xs">{s.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{s.sku || "—"}</span>
                          <span className="text-xs text-right">{s.piecePrice ? `$${s.piecePrice.toFixed(2)}` : "—"}</span>
                        </React.Fragment>
                      ))}
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
          <Save className="w-3 h-3 mr-1" /> Save Color Selections
        </Button>
      )}
    </div>
  );
}
