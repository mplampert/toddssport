import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import {
  useStorePersonalizationDefaults,
  DEFAULT_PERSONALIZATION,
  type PersonalizationSettings,
} from "@/hooks/useStorePersonalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function StorePersonalization() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const { data: defaults, isLoading } = useStorePersonalizationDefaults(store.id);

  const [form, setForm] = useState<PersonalizationSettings>(DEFAULT_PERSONALIZATION);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (defaults) {
      setForm(defaults);
      setDirty(false);
    }
  }, [defaults]);

  const patch = (updates: Partial<PersonalizationSettings>) => {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_personalization_defaults")
        .upsert({
          store_id: store.id,
          ...form,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-personalization-defaults", store.id] });
      toast.success("Personalization defaults saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyToAllMutation = useMutation({
    mutationFn: async (clearOverrides: boolean) => {
      if (clearOverrides) {
        const { error } = await supabase
          .from("team_store_products")
          .update({
            personalization_override_enabled: false,
            personalization_settings: null,
          })
          .eq("team_store_id", store.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_store_products")
          .update({
            personalization_override_enabled: false,
            personalization_settings: null,
          })
          .eq("team_store_id", store.id)
          .eq("personalization_override_enabled", false);
        if (error) throw error;
      }
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
      <h2 className="text-2xl font-bold text-foreground">Personalization Defaults</h2>
      <p className="text-sm text-muted-foreground">
        Set store-wide Name &amp; Number options. Products use these unless they have an override.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Name Personalization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.enable_name} onCheckedChange={(v) => patch({ enable_name: v })} />
            <Label>Enable Name field</Label>
          </div>
          {form.enable_name && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={form.name_label} onChange={(e) => patch({ name_label: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Length</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.name_max_length}
                  onChange={(e) => patch({ name_max_length: parseInt(e.target.value) || 16 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upcharge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.name_price}
                  onChange={(e) => patch({ name_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 col-span-full">
                <Switch checked={form.name_required} onCheckedChange={(v) => patch({ name_required: v })} />
                <Label className="text-sm">Required</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Number Personalization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.enable_number} onCheckedChange={(v) => patch({ enable_number: v })} />
            <Label>Enable Number field</Label>
          </div>
          {form.enable_number && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={form.number_label} onChange={(e) => patch({ number_label: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Length</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.number_max_length}
                  onChange={(e) => patch({ number_max_length: parseInt(e.target.value) || 2 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upcharge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.number_price}
                  onChange={(e) => patch({ number_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 col-span-full">
                <Switch checked={form.number_required} onCheckedChange={(v) => patch({ number_required: v })} />
                <Label className="text-sm">Required</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.instructions || ""}
            onChange={(e) => patch({ instructions: e.target.value || null })}
            placeholder="Optional instructions shown to customers (e.g. 'Last name only, no symbols')"
            rows={3}
          />
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
