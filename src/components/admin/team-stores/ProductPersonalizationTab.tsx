import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStorePersonalizationDefaults,
  resolvePersonalization,
  type PersonalizationSettings,
  type CustomPersonalizationField,
} from "@/hooks/useStorePersonalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, RotateCcw, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: {
    id: string;
    personalization_override_enabled?: boolean;
    personalization_settings?: any;
  };
  storeId: string;
}

function CustomFieldEditor({
  field,
  onChange,
  onDelete,
  disabled,
}: {
  field: CustomPersonalizationField;
  onChange: (updates: Partial<CustomPersonalizationField>) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [newOption, setNewOption] = useState("");

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              disabled={disabled}
              placeholder="e.g. Nickname"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={field.type} onValueChange={(v) => onChange({ type: v as "text" | "dropdown" })} disabled={disabled}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Free Text</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={onDelete} disabled={disabled}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Upcharge ($)</Label>
          <Input
            type="number" step="0.01" min={0}
            value={field.price}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
            disabled={disabled}
          />
        </div>
        {field.type === "text" && (
          <div className="space-y-1">
            <Label className="text-xs">Max Length</Label>
            <Input
              type="number" min={1}
              value={field.max_length}
              onChange={(e) => onChange({ max_length: parseInt(e.target.value) || 20 })}
              disabled={disabled}
            />
          </div>
        )}
        <div className="flex items-end pb-0.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={field.required}
              onCheckedChange={(v) => onChange({ required: v })}
              disabled={disabled}
            />
            <Label className="text-xs">Required</Label>
          </div>
        </div>
      </div>

      {field.type === "dropdown" && (
        <div className="space-y-2">
          <Label className="text-xs">Options</Label>
          <div className="flex flex-wrap gap-1.5">
            {field.options.map((opt, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {opt}
                <button
                  onClick={() => onChange({ options: field.options.filter((_, j) => j !== i) })}
                  className="ml-0.5 hover:text-destructive"
                  disabled={disabled}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option…"
              className="h-8 text-xs"
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newOption.trim()) {
                  e.preventDefault();
                  onChange({ options: [...field.options, newOption.trim()] });
                  setNewOption("");
                }
              }}
            />
            <Button
              size="sm" variant="outline" className="h-8 text-xs"
              disabled={disabled || !newOption.trim()}
              onClick={() => {
                onChange({ options: [...field.options, newOption.trim()] });
                setNewOption("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductPersonalizationTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const { data: storeDefaults, isLoading } = useStorePersonalizationDefaults(storeId);

  const [overrideEnabled, setOverrideEnabled] = useState(item.personalization_override_enabled ?? false);
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [dirty, setDirty] = useState(false);

  const effective = resolvePersonalization(storeDefaults, {
    personalization_override_enabled: overrideEnabled,
    personalization_settings: settings,
  });

  useEffect(() => {
    setOverrideEnabled(item.personalization_override_enabled ?? false);
    setSettings(item.personalization_settings ?? null);
    setDirty(false);
  }, [item.id]);

  const patch = (updates: Partial<PersonalizationSettings>) => {
    setSettings((prev) => ({ ...(prev ?? effective), ...updates }));
    setDirty(true);
  };

  const toggleOverride = (on: boolean) => {
    setOverrideEnabled(on);
    if (on && !settings) {
      setSettings({ ...effective });
    }
    if (!on) {
      setSettings(null);
    }
    setDirty(true);
  };

  const addCustomField = () => {
    const newField: CustomPersonalizationField = {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      required: false,
      max_length: 20,
      options: [],
      price: 0,
    };
    patch({ custom_fields: [...(display.custom_fields ?? []), newField] });
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomPersonalizationField>) => {
    patch({
      custom_fields: (display.custom_fields ?? []).map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    });
  };

  const deleteCustomField = (fieldId: string) => {
    patch({
      custom_fields: (display.custom_fields ?? []).filter((f) => f.id !== fieldId),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          personalization_override_enabled: overrideEnabled,
          personalization_settings: (overrideEnabled ? settings : null) as any,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", item.id] });
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Personalization settings saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetToDefaults = () => {
    setOverrideEnabled(false);
    setSettings(null);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
      </div>
    );
  }

  const display = overrideEnabled && settings ? settings : effective;

  return (
    <div className="space-y-4 max-w-2xl">
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

      {/* Name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={display.enable_name}
              onCheckedChange={(v) => patch({ enable_name: v })}
              disabled={!overrideEnabled}
            />
            <Label>Enabled</Label>
          </div>
          {display.enable_name && (
            <div className="grid grid-cols-3 gap-3 pl-8">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={display.name_label}
                  onChange={(e) => patch({ name_label: e.target.value })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Length</Label>
                <Input
                  type="number" min={1}
                  value={display.name_max_length}
                  onChange={(e) => patch({ name_max_length: parseInt(e.target.value) || 16 })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upcharge ($)</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={display.name_price}
                  onChange={(e) => patch({ name_price: parseFloat(e.target.value) || 0 })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="flex items-center gap-2 col-span-full">
                <Switch
                  checked={display.name_required}
                  onCheckedChange={(v) => patch({ name_required: v })}
                  disabled={!overrideEnabled}
                />
                <Label className="text-sm">Required</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Number */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={display.enable_number}
              onCheckedChange={(v) => patch({ enable_number: v })}
              disabled={!overrideEnabled}
            />
            <Label>Enabled</Label>
          </div>
          {display.enable_number && (
            <div className="grid grid-cols-3 gap-3 pl-8">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={display.number_label}
                  onChange={(e) => patch({ number_label: e.target.value })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Length</Label>
                <Input
                  type="number" min={1}
                  value={display.number_max_length}
                  onChange={(e) => patch({ number_max_length: parseInt(e.target.value) || 2 })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Upcharge ($)</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={display.number_price}
                  onChange={(e) => patch({ number_price: parseFloat(e.target.value) || 0 })}
                  disabled={!overrideEnabled}
                />
              </div>
              <div className="flex items-center gap-2 col-span-full">
                <Switch
                  checked={display.number_required}
                  onCheckedChange={(v) => patch({ number_required: v })}
                  disabled={!overrideEnabled}
                />
                <Label className="text-sm">Required</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Custom Fields</CardTitle>
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={addCustomField}
              disabled={!overrideEnabled}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!display.custom_fields || display.custom_fields.length === 0) ? (
            <p className="text-xs text-muted-foreground py-2">
              No custom fields. Add fields like "Nickname", "Team Role", or "Position" with text input or dropdown options.
            </p>
          ) : (
            display.custom_fields.map((field) => (
              <CustomFieldEditor
                key={field.id}
                field={field}
                onChange={(updates) => updateCustomField(field.id, updates)}
                onDelete={() => deleteCustomField(field.id)}
                disabled={!overrideEnabled}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={display.instructions || ""}
            onChange={(e) => patch({ instructions: e.target.value || null })}
            placeholder="Optional instructions shown to customers"
            disabled={!overrideEnabled}
            rows={2}
          />
        </CardContent>
      </Card>

      {dirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save Personalization
        </Button>
      )}
    </div>
  );
}
