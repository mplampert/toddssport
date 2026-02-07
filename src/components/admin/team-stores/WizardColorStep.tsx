import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wand2, Palette, Check, X } from "lucide-react";
import { toast } from "sonner";

export interface ColorSelection {
  code: string;
  name: string;
}

interface ProductForColors {
  ssStyleID: number;
  styleName: string;
  brandName: string;
  styleImage: string | null;
  allowedColors: ColorSelection[];
}

interface Props {
  products: ProductForColors[];
  storeId: string;
  onUpdateColors: (ssStyleID: number, colors: ColorSelection[]) => void;
}

interface ColorOption {
  code: string;
  name: string;
  swatchImage?: string;
  color1?: string;
  color2?: string;
}

export function WizardColorStep({ products, storeId, onUpdateColors }: Props) {
  const [expandedProduct, setExpandedProduct] = useState<number | null>(
    products.length > 0 ? products[0].ssStyleID : null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [colorsLoading, setColorsLoading] = useState(true);
  const [productColors, setProductColors] = useState<Map<number, ColorOption[]>>(new Map());

  // Fetch store info for AI
  const { data: store } = useQuery({
    queryKey: ["store-for-colors", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("name, primary_color, secondary_color, store_type")
        .eq("id", storeId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch all available colors for each product from SS API
  useEffect(() => {
    const fetchColors = async () => {
      setColorsLoading(true);
      const map = new Map<number, ColorOption[]>();

      for (const p of products) {
        try {
          const ssProducts = await getProducts({ style: p.ssStyleID });
          const colorMap = new Map<string, ColorOption>();
          ssProducts.forEach((sp: SSProduct) => {
            if (sp.colorName && !colorMap.has(sp.colorCode)) {
              colorMap.set(sp.colorCode, {
                code: sp.colorCode,
                name: sp.colorName,
                swatchImage: (sp as any).colorSwatchImage,
                color1: (sp as any).color1,
                color2: (sp as any).color2,
              });
            }
          });
          map.set(p.ssStyleID, Array.from(colorMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        } catch {
          map.set(p.ssStyleID, []);
        }
      }

      setProductColors(map);
      setColorsLoading(false);
    };

    if (products.length > 0) fetchColors();
  }, [products]);

  const handleAISuggest = useCallback(async () => {
    if (!store) {
      toast.error("Store info not loaded");
      return;
    }

    setAiLoading(true);
    try {
      const payload = {
        storeName: store.name,
        primaryColor: store.primary_color,
        secondaryColor: store.secondary_color,
        storeType: store.store_type,
        products: products.map((p) => ({
          styleName: p.styleName,
          brandName: p.brandName,
          colors: (productColors.get(p.ssStyleID) || []).map((c) => ({
            code: c.code,
            name: c.name,
          })),
        })),
      };

      const { data, error } = await supabase.functions.invoke("suggest-colors", {
        body: payload,
      });

      if (error) throw new Error(error.message || "AI suggestion failed");
      if (data?.error) throw new Error(data.error);

      const selections = data?.selections as { styleName: string; selectedCodes: string[] }[];
      if (!selections || selections.length === 0) {
        toast.error("AI returned no suggestions");
        return;
      }

      // Apply suggestions
      for (const sel of selections) {
        const product = products.find((p) => p.styleName === sel.styleName);
        if (!product) continue;
        const availableColors = productColors.get(product.ssStyleID) || [];
        const matched = availableColors
          .filter((c) => sel.selectedCodes.includes(c.code))
          .map((c) => ({ code: c.code, name: c.name }));
        if (matched.length > 0) {
          onUpdateColors(product.ssStyleID, matched);
        }
      }

      toast.success("AI color suggestions applied! Review and adjust as needed.");
    } catch (e: any) {
      console.error("AI suggest error:", e);
      toast.error(e.message || "Failed to get AI suggestions");
    } finally {
      setAiLoading(false);
    }
  }, [store, products, productColors, onUpdateColors]);

  const toggleColor = (ssStyleID: number, color: ColorOption) => {
    const product = products.find((p) => p.ssStyleID === ssStyleID);
    if (!product) return;

    const current = product.allowedColors;
    const exists = current.some((c) => c.code === color.code);
    const updated = exists
      ? current.filter((c) => c.code !== color.code)
      : [...current, { code: color.code, name: color.name }];
    onUpdateColors(ssStyleID, updated);
  };

  const selectAllColors = (ssStyleID: number) => {
    const available = productColors.get(ssStyleID) || [];
    onUpdateColors(ssStyleID, available.map((c) => ({ code: c.code, name: c.name })));
  };

  const clearAllColors = (ssStyleID: number) => {
    onUpdateColors(ssStyleID, []);
  };

  if (colorsLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading available colors from catalog…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Suggest button */}
      <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border">
        <div className="space-y-0.5">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-accent" /> AI Color Assistant
          </p>
          <p className="text-xs text-muted-foreground">
            Pre-select colors based on your team colors
            {store?.primary_color && (
              <span className="inline-flex items-center gap-1 ml-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: store.primary_color }}
                />
                <span
                  className="inline-block w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: store.secondary_color || undefined }}
                />
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAISuggest}
          disabled={aiLoading || !store}
        >
          {aiLoading ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Suggesting…</>
          ) : (
            <><Wand2 className="w-4 h-4 mr-1" /> Suggest Colors</>
          )}
        </Button>
      </div>

      {/* Per-product color selection */}
      <div className="space-y-2">
        {products.map((p) => {
          const available = productColors.get(p.ssStyleID) || [];
          const isExpanded = expandedProduct === p.ssStyleID;
          const selectedCount = p.allowedColors.length;

          return (
            <div key={p.ssStyleID} className="border rounded-md overflow-hidden">
              {/* Product header - clickable to expand */}
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedProduct(isExpanded ? null : p.ssStyleID)}
              >
                {p.styleImage && (
                  <img src={p.styleImage} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.styleName}</p>
                  <p className="text-xs text-muted-foreground">{p.brandName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="text-xs">
                    <Palette className="w-3 h-3 mr-1" />
                    {selectedCount > 0 ? `${selectedCount} / ${available.length}` : `0 / ${available.length}`}
                  </Badge>
                </div>
              </button>

              {/* Expanded color grid */}
              {isExpanded && (
                <div className="border-t px-3 py-3 space-y-3">
                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => selectAllColors(p.ssStyleID)}>
                      <Check className="w-3 h-3 mr-1" /> Select All
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => clearAllColors(p.ssStyleID)}>
                      <X className="w-3 h-3 mr-1" /> Clear All
                    </Button>
                    {selectedCount === 0 && (
                      <span className="text-xs text-amber-600">⚠ No colors selected — all colors will show on storefront</span>
                    )}
                  </div>

                  {/* Color swatches */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {available.map((c) => {
                      const isSelected = p.allowedColors.some((ac) => ac.code === c.code);
                      return (
                        <label
                          key={c.code}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                            isSelected ? "bg-accent/10 border-accent" : "border-border hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleColor(p.ssStyleID, c)}
                            className="shrink-0"
                          />
                          {c.swatchImage ? (
                            <img src={c.swatchImage} alt={c.name} className="w-5 h-5 rounded-sm border border-border shrink-0" />
                          ) : c.color1 ? (
                            <span
                              className="w-5 h-5 rounded-sm border border-border shrink-0"
                              style={{
                                background: c.color2
                                  ? `linear-gradient(135deg, ${c.color1} 50%, ${c.color2} 50%)`
                                  : c.color1,
                              }}
                            />
                          ) : (
                            <span className="w-5 h-5 rounded-sm bg-muted border border-border shrink-0" />
                          )}
                          <span className="text-xs truncate">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {available.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No color data available for this product.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
