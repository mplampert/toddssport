import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StoreProduct } from "./ProductListPane";

interface Props {
  item: StoreProduct;
  storeId: string;
  categories: { id: string; name: string; slug: string; overrideId?: string | null; isCustom?: boolean }[];
}

/* ── helpers ── */
const num = (v: string) => v.trim() ? parseFloat(v) : null;

export function ProductEditorOverviewTab({ item, storeId, categories }: Props) {
  const queryClient = useQueryClient();
  const style = item.catalog_styles;

  const [displayName, setDisplayName] = useState(item.display_name ?? "");
  const [active, setActive] = useState(item.active);
  const [internalNotes, setInternalNotes] = useState(item.internal_notes ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(item.category_id ?? item.store_category_override_id ?? null);
  const [screenPrint, setScreenPrint] = useState(item.screen_print_enabled);
  const [embroidery, setEmbroidery] = useState(item.embroidery_enabled);
  const [dtf, setDtf] = useState(item.dtf_enabled);

  // Pricing fields
  const [priceOverride, setPriceOverride] = useState(item.price_override != null ? String(item.price_override) : "");
  const [fundraisingEnabled, setFundraisingEnabled] = useState(item.fundraising_enabled);
  const [fundraisingAmount, setFundraisingAmount] = useState(item.fundraising_amount_per_unit != null ? String(item.fundraising_amount_per_unit) : "");
  const [fundraisingPct, setFundraisingPct] = useState(item.fundraising_percentage != null ? String(item.fundraising_percentage) : "");

  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const isCustom = selectedCat?.isCustom ?? false;
      const { error } = await supabase
        .from("team_store_products")
        .update({
          display_name: displayName.trim() || null,
          active,
          internal_notes: internalNotes.trim() || null,
          notes: notes.trim() || null,
          category_id: isCustom ? null : (categoryId || null),
          store_category_override_id: isCustom ? (selectedCat?.overrideId ?? categoryId) : null,
          screen_print_enabled: screenPrint,
          embroidery_enabled: embroidery,
          dtf_enabled: dtf,
          price_override: num(priceOverride),
          fundraising_enabled: fundraisingEnabled,
          fundraising_amount_per_unit: num(fundraisingAmount),
          fundraising_percentage: num(fundraisingPct),
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", item.id] });
      toast.success("Overview saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = () => setDirty(true);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Catalog Info */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Catalog Name / SKU — Internal, read-only</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><span className="text-muted-foreground">Catalog Name:</span> {style?.style_name}</div>
          <div><span className="text-muted-foreground">Brand:</span> {style?.brand_name}</div>
          <div><span className="text-muted-foreground">SKU / Style ID:</span> {(style as any)?.part_number || style?.style_id}</div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Work orders and production views always use this catalog name and SKU.</p>
        {style?.style_image && (
          <img src={style.style_image} alt="" className="w-20 h-20 object-contain rounded mt-2" />
        )}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Storefront Name <span className="text-muted-foreground font-normal">(what customers see)</span></Label>
          <Input value={displayName} onChange={(e) => { setDisplayName(e.target.value); m(); }} placeholder={style?.style_name || "Product name"} />
          <p className="text-[10px] text-muted-foreground">Leave blank to use the catalog name. This does not affect work orders or internal views.</p>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={(v) => { setActive(v); m(); }} />
          <Label>Active (visible on storefront)</Label>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId ?? "none"} onValueChange={(v) => { setCategoryId(v === "none" ? null : v); m(); }}>
            <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Customer Notes (shown on storefront)</Label>
          <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); m(); }} placeholder='e.g. "Home jersey"' rows={2} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Internal Notes (admin only)</Label>
          <Textarea value={internalNotes} onChange={(e) => { setInternalNotes(e.target.value); m(); }} placeholder="Not shown to customers" rows={2} />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="font-medium">Decoration Methods</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={screenPrint} onCheckedChange={(v) => { setScreenPrint(!!v); m(); }} /> Screen Print
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={embroidery} onCheckedChange={(v) => { setEmbroidery(!!v); m(); }} /> Embroidery
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={dtf} onCheckedChange={(v) => { setDtf(!!v); m(); }} /> DTF
          </label>
        </div>
      </div>

      <Separator />

      {/* ── Pricing ── */}
      <div className="space-y-4">
        <Label className="font-medium">Pricing</Label>
        <div className="space-y-1.5">
          <Label>Price Override ($)</Label>
          <Input type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => { setPriceOverride(e.target.value); m(); }} placeholder="Leave blank for default" className="w-48" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={fundraisingEnabled} onCheckedChange={(v) => { setFundraisingEnabled(v); m(); }} />
            <Label>Fundraising</Label>
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
      </div>

      {dirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" /> Save Overview
        </Button>
      )}
    </div>
  );
}
