import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, ChevronDown, ChevronUp, Image, Tags } from "lucide-react";
import { toast } from "sonner";
import { LogoAssignmentDialog } from "./LogoAssignmentDialog";

interface PersonalizationConfig {
  allow_name?: boolean;
  allow_number?: boolean;
  max_chars?: number;
}

interface ProductRowCardProps {
  item: any;
  storeId: string;
  onRemove: () => void;
  categories?: { id: string; name: string; slug: string }[];
}

export function ProductRowCard({ item, storeId, onRemove, categories = [] }: ProductRowCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);

  const [notes, setNotes] = useState(item.notes ?? "");
  const [priceOverride, setPriceOverride] = useState(item.price_override != null ? String(item.price_override) : "");
  const [categoryId, setCategoryId] = useState<string | null>(item.category_id ?? null);
  const [fundraisingEnabled, setFundraisingEnabled] = useState(item.fundraising_enabled ?? true);
  const [fundraisingAmount, setFundraisingAmount] = useState(item.fundraising_amount_per_unit != null ? String(item.fundraising_amount_per_unit) : "");
  const [personalizationEnabled, setPersonalizationEnabled] = useState(item.personalization_enabled ?? false);
  const [personalizationPrice, setPersonalizationPrice] = useState(item.personalization_price != null ? String(item.personalization_price) : "");
  const [personalizationConfig, setPersonalizationConfig] = useState<PersonalizationConfig>(item.personalization_config ?? { allow_name: false, allow_number: false, max_chars: 20 });
  const [screenPrintEnabled, setScreenPrintEnabled] = useState(item.screen_print_enabled ?? false);
  const [embroideryEnabled, setEmbroideryEnabled] = useState(item.embroidery_enabled ?? false);
  const [dtfEnabled, setDtfEnabled] = useState(item.dtf_enabled ?? false);
  const [dirty, setDirty] = useState(false);

  const { data: assignedLogos = [] } = useQuery({
    queryKey: ["item-logos", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_logos")
        .select("id, position, store_logo_id, store_logos(id, name, method, file_url)")
        .eq("team_store_item_id", item.id);
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          notes: notes.trim() || null,
          price_override: priceOverride.trim() ? parseFloat(priceOverride) : null,
          category_id: categoryId || null,
          fundraising_enabled: fundraisingEnabled,
          fundraising_amount_per_unit: fundraisingAmount.trim() ? parseFloat(fundraisingAmount) : null,
          personalization_enabled: personalizationEnabled,
          personalization_price: personalizationPrice.trim() ? parseFloat(personalizationPrice) : null,
          personalization_config: personalizationConfig as any,
          screen_print_enabled: screenPrintEnabled,
          embroidery_enabled: embroideryEnabled,
          dtf_enabled: dtfEnabled,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Product updated");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markDirty = () => setDirty(true);

  const categoryName = item.team_store_categories?.name;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {item.catalog_styles?.style_image && (
            <img src={item.catalog_styles.style_image} alt="" className="w-10 h-10 object-contain rounded" />
          )}
          <div>
            <p className="text-sm font-medium">{item.catalog_styles?.style_name ?? `Style #${item.style_id}`}</p>
            <p className="text-xs text-muted-foreground">{item.catalog_styles?.brand_name ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {categoryName && (
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Tags className="w-2.5 h-2.5" /> {categoryName}
          </span>
        )}
        {fundraisingEnabled && <span className="bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">Fundraising</span>}
        {personalizationEnabled && <span className="bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">Personalization</span>}
        {screenPrintEnabled && <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Screen Print</span>}
        {embroideryEnabled && <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Embroidery</span>}
        {dtfEnabled && <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">DTF</span>}
        {assignedLogos.length > 0 && <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{assignedLogos.length} logo(s)</span>}
      </div>

      {expanded && (
        <div className="space-y-4 pt-2 border-t">
          {/* Category & Notes & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={categoryId ?? "none"}
                onValueChange={(v) => { setCategoryId(v === "none" ? null : v); markDirty(); }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (shown to customers)</Label>
              <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); markDirty(); }} placeholder='e.g. "Home jersey"' rows={2} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price Override ($)</Label>
              <Input type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => { setPriceOverride(e.target.value); markDirty(); }} placeholder="Leave blank for default" className="text-xs" />
            </div>
          </div>

          {/* Fundraising */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={fundraisingEnabled} onCheckedChange={(v) => { setFundraisingEnabled(v); markDirty(); }} />
              <Label className="text-xs font-medium">Fundraising Enabled</Label>
            </div>
            {fundraisingEnabled && (
              <div className="space-y-1 pl-10">
                <Label className="text-xs">Amount per Unit ($)</Label>
                <Input type="number" step="0.01" min="0" value={fundraisingAmount} onChange={(e) => { setFundraisingAmount(e.target.value); markDirty(); }} placeholder="e.g. 5.00" className="text-xs w-40" />
              </div>
            )}
          </div>

          {/* Personalization */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={personalizationEnabled} onCheckedChange={(v) => { setPersonalizationEnabled(v); markDirty(); }} />
              <Label className="text-xs font-medium">Personalization Enabled</Label>
            </div>
            {personalizationEnabled && (
              <div className="space-y-2 pl-10">
                <div className="space-y-1">
                  <Label className="text-xs">Personalization Price ($)</Label>
                  <Input type="number" step="0.01" min="0" value={personalizationPrice} onChange={(e) => { setPersonalizationPrice(e.target.value); markDirty(); }} placeholder="e.g. 8.00" className="text-xs w-40" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={personalizationConfig.allow_name ?? false} onCheckedChange={(v) => { setPersonalizationConfig(c => ({ ...c, allow_name: !!v })); markDirty(); }} />
                    Allow Name
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={personalizationConfig.allow_number ?? false} onCheckedChange={(v) => { setPersonalizationConfig(c => ({ ...c, allow_number: !!v })); markDirty(); }} />
                    Allow Number
                  </label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Characters</Label>
                  <Input type="number" min="1" max="100" value={personalizationConfig.max_chars ?? 20} onChange={(e) => { setPersonalizationConfig(c => ({ ...c, max_chars: parseInt(e.target.value) || 20 })); markDirty(); }} className="text-xs w-24" />
                </div>
              </div>
            )}
          </div>

          {/* Decoration Methods */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Decoration Methods</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={screenPrintEnabled} onCheckedChange={(v) => { setScreenPrintEnabled(!!v); markDirty(); }} />
                Screen Print
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={embroideryEnabled} onCheckedChange={(v) => { setEmbroideryEnabled(!!v); markDirty(); }} />
                Embroidery
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={dtfEnabled} onCheckedChange={(v) => { setDtfEnabled(!!v); markDirty(); }} />
                DTF
              </label>
            </div>
          </div>

          {/* Logos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Assigned Logos ({assignedLogos.length})</Label>
              <Button size="sm" variant="outline" onClick={() => setLogoDialogOpen(true)}>
                <Image className="w-3 h-3 mr-1" /> Assign Logos
              </Button>
            </div>
            {assignedLogos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assignedLogos.map((al: any) => (
                  <div key={al.id} className="flex items-center gap-1.5 border rounded px-2 py-1 text-xs">
                    <img src={al.store_logos?.file_url} alt="" className="w-5 h-5 object-contain" />
                    <span>{al.store_logos?.name}</span>
                    {al.position && <span className="text-muted-foreground">({al.position})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          {dirty && (
            <Button size="sm" variant="outline" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save Changes
            </Button>
          )}
        </div>
      )}

      <LogoAssignmentDialog
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
        storeId={storeId}
        itemId={item.id}
        assignedLogoIds={assignedLogos.map((al: any) => al.store_logo_id)}
      />
    </div>
  );
}
