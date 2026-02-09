import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import {
  useStoreDecorationPricingDefaults,
  DEFAULT_DECORATION_PRICING,
  DECORATION_METHODS,
  DECORATION_PLACEMENTS,
  type DecorationPrices,
} from "@/hooks/useStoreDecorationPricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function StoreDecorationPricing() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const { data: defaults, isLoading } = useStoreDecorationPricingDefaults(store.id);

  const [prices, setPrices] = useState<DecorationPrices>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (defaults) {
      setPrices(defaults.prices || {});
      setDirty(false);
    }
  }, [defaults]);

  const setPrice = (method: string, placement: string, value: string) => {
    setPrices((prev) => {
      const methodPrices = { ...(prev[method] || {}) };
      const num = parseFloat(value);
      if (isNaN(num) || value === "") {
        delete methodPrices[placement];
      } else {
        methodPrices[placement] = num;
      }
      return { ...prev, [method]: methodPrices };
    });
    setDirty(true);
  };

  const getPrice = (method: string, placement: string): string => {
    const val = prices[method]?.[placement];
    return val != null ? String(val) : "";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_decoration_price_defaults")
        .upsert({
          store_id: store.id,
          pricing_mode: "per_placement",
          prices,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-decoration-pricing-defaults", store.id] });
      toast.success("Decoration pricing defaults saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyToAllMutation = useMutation({
    mutationFn: async (clearOverrides: boolean) => {
      const update = {
        decoration_pricing_override_enabled: false,
        decoration_prices_override: null,
      };
      let q = supabase.from("team_store_products").update(update).eq("team_store_id", store.id);
      if (!clearOverrides) {
        q = q.eq("decoration_pricing_override_enabled", false);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
      toast.success("Product overrides cleared");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Decoration Pricing Defaults</h2>
      <p className="text-sm text-muted-foreground">
        Set upcharges per decoration method &amp; placement. Products use these unless they have an override.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Price Matrix (Method × Placement)</CardTitle>
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

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !dirty}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save Defaults
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyToAllMutation.mutate(true)}
          disabled={applyToAllMutation.isPending}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Clear all product overrides
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyToAllMutation.mutate(false)}
          disabled={applyToAllMutation.isPending}
        >
          Reset non-overridden products
        </Button>
      </div>
    </div>
  );
}
