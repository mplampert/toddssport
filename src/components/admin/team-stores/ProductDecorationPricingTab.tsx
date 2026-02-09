import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStoreDecorationPricingDefaults,
  resolveDecorationPricing,
  DECORATION_METHODS,
  DECORATION_PLACEMENTS,
  type DecorationPrices,
} from "@/hooks/useStoreDecorationPricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: {
    id: string;
    decoration_pricing_override_enabled?: boolean;
    decoration_prices_override?: any;
  };
  storeId: string;
}

export function ProductDecorationPricingTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const { data: storeDefaults, isLoading } = useStoreDecorationPricingDefaults(storeId);

  const [overrideEnabled, setOverrideEnabled] = useState(item.decoration_pricing_override_enabled ?? false);
  const [prices, setPrices] = useState<DecorationPrices | null>(null);
  const [dirty, setDirty] = useState(false);

  const effective = resolveDecorationPricing(storeDefaults, {
    decoration_pricing_override_enabled: overrideEnabled,
    decoration_prices_override: prices ? { prices } : null,
  });

  useEffect(() => {
    setOverrideEnabled(item.decoration_pricing_override_enabled ?? false);
    setPrices(item.decoration_prices_override?.prices ?? item.decoration_prices_override ?? null);
    setDirty(false);
  }, [item.id]);

  const toggleOverride = (on: boolean) => {
    setOverrideEnabled(on);
    if (on && !prices) {
      setPrices({ ...effective.prices });
    }
    if (!on) setPrices(null);
    setDirty(true);
  };

  const setPrice = (method: string, placement: string, value: string) => {
    setPrices((prev) => {
      const current = { ...(prev ?? effective.prices) };
      const methodPrices = { ...(current[method] || {}) };
      const num = parseFloat(value);
      if (isNaN(num) || value === "") {
        delete methodPrices[placement];
      } else {
        methodPrices[placement] = num;
      }
      return { ...current, [method]: methodPrices };
    });
    setDirty(true);
  };

  const getPrice = (method: string, placement: string): string => {
    const source = overrideEnabled && prices ? prices : effective.prices;
    const val = source[method]?.[placement];
    return val != null ? String(val) : "";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          decoration_pricing_override_enabled: overrideEnabled,
          decoration_prices_override: overrideEnabled ? { prices } : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", item.id] });
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Decoration pricing saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetToDefaults = () => {
    setOverrideEnabled(false);
    setPrices(null);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Override toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={overrideEnabled} onCheckedChange={toggleOverride} />
          <Label className="font-medium">Override store defaults for this product</Label>
        </div>
        <Badge variant={overrideEnabled ? "default" : "secondary"}>
          {overrideEnabled ? "Custom" : "Using Store Defaults"}
        </Badge>
      </div>

      {overrideEnabled && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={resetToDefaults}>
          <RotateCcw className="w-3 h-3 mr-1" /> Reset to store defaults
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Matrix (Method × Placement)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Placement</th>
                  {DECORATION_METHODS.map((m) => (
                    <th key={m.value} className="text-center py-2 px-2 font-medium text-muted-foreground min-w-[100px]">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DECORATION_PLACEMENTS.map((p) => (
                  <tr key={p.value} className="border-t border-border">
                    <td className="py-2 px-2 text-foreground">{p.label}</td>
                    {DECORATION_METHODS.map((m) => (
                      <td key={m.value} className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 w-24 pl-5 text-right"
                            value={getPrice(m.value, p.value)}
                            onChange={(e) => setPrice(m.value, p.value, e.target.value)}
                            disabled={!overrideEnabled}
                            placeholder="—"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {dirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save Decoration Pricing
        </Button>
      )}
    </div>
  );
}
