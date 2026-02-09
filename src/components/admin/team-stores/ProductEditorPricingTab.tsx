import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StoreProduct } from "./ProductListPane";

interface Props {
  item: StoreProduct;
  storeId: string;
}

export function ProductEditorPricingTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();

  const [priceOverride, setPriceOverride] = useState(item.price_override != null ? String(item.price_override) : "");
  const [fundraisingEnabled, setFundraisingEnabled] = useState(item.fundraising_enabled);
  const [fundraisingAmount, setFundraisingAmount] = useState(item.fundraising_amount_per_unit != null ? String(item.fundraising_amount_per_unit) : "");
  const [fundraisingPct, setFundraisingPct] = useState(item.fundraising_percentage != null ? String(item.fundraising_percentage) : "");
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          price_override: priceOverride.trim() ? parseFloat(priceOverride) : null,
          fundraising_enabled: fundraisingEnabled,
          fundraising_amount_per_unit: fundraisingAmount.trim() ? parseFloat(fundraisingAmount) : null,
          fundraising_percentage: fundraisingPct.trim() ? parseFloat(fundraisingPct) : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", item.id] });
      toast.success("Pricing saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = () => setDirty(true);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <Label>Price Override ($)</Label>
        <Input type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => { setPriceOverride(e.target.value); m(); }} placeholder="Leave blank for default" className="w-48" />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={fundraisingEnabled} onCheckedChange={(v) => { setFundraisingEnabled(v); m(); }} />
          <Label className="font-medium">Fundraising</Label>
        </div>
        {fundraisingEnabled && (
          <div className="space-y-3 pl-12">
            <div className="space-y-1.5">
              <Label>Amount per Unit ($)</Label>
              <Input type="number" step="0.01" min="0" value={fundraisingAmount} onChange={(e) => { setFundraisingAmount(e.target.value); m(); }} placeholder="e.g. 5.00" className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Fundraising Percentage (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" value={fundraisingPct} onChange={(e) => { setFundraisingPct(e.target.value); m(); }} placeholder="e.g. 15" className="w-40" />
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" /> Save Pricing
        </Button>
      )}
    </div>
  );
}
