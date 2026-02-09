import { useState } from "react";
import { getProductImage, handleImageError } from "@/lib/productImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Package } from "lucide-react";
import { ProductVariantsTab } from "./ProductVariantsTab";
import { ProductLogosTab } from "./ProductLogosTab";
import { toast } from "sonner";
import { ProductOverridesPanel } from "./ProductOverridesPanel";
import { ProductMessagesPanel } from "./ProductMessagesPanel";
import type { StoreProduct } from "./ProductListPane";

interface PersonalizationConfig {
  allow_name?: boolean;
  allow_number?: boolean;
  max_chars?: number;
}

interface Props {
  item: StoreProduct;
  storeId: string;
  categories: { id: string; name: string; slug: string; overrideId?: string | null; isCustom?: boolean }[];
}

export function ProductDetailPane({ item, storeId, categories }: Props) {
  const queryClient = useQueryClient();
  const style = item.catalog_styles;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b shrink-0">
        {getProductImage(item) && (
          <img
            src={getProductImage(item)}
            alt=""
            className="w-12 h-12 object-contain rounded border bg-muted p-1"
            onError={handleImageError}
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {item.display_name || style?.style_name || `Style #${item.style_id}`}
          </h3>
          <p className="text-xs text-muted-foreground">{style?.brand_name} · #{style?.style_id}</p>
        </div>
        <Badge variant={item.active ? "default" : "secondary"} className="ml-auto shrink-0 text-xs">
          {item.active ? "Active" : "Hidden"}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-4 h-auto py-0 bg-transparent shrink-0">
          {["Overview", "Pricing", "Images", "Logos", "Messages", "Variants"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent py-2.5 px-3"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="m-0 p-4">
            <OverviewTab item={item} storeId={storeId} categories={categories} />
          </TabsContent>
          <TabsContent value="pricing" className="m-0 p-4">
            <PricingTab item={item} storeId={storeId} />
          </TabsContent>
          <TabsContent value="images" className="m-0 p-4">
            <ImagesTab item={item} storeId={storeId} />
          </TabsContent>
          <TabsContent value="logos" className="m-0 p-4">
            <ProductLogosTab item={item} storeId={storeId} />
          </TabsContent>
          <TabsContent value="messages" className="m-0 p-4">
            <ProductMessagesPanel storeId={storeId} productId={item.id} />
          </TabsContent>
          <TabsContent value="variants" className="m-0 p-4">
            <ProductVariantsTab item={item} storeId={storeId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ item, storeId, categories }: { item: StoreProduct; storeId: string; categories: Props["categories"] }) {
  const queryClient = useQueryClient();
  const style = item.catalog_styles;

  const [displayName, setDisplayName] = useState(item.display_name ?? "");
  const [active, setActive] = useState(item.active);
  const [internalNotes, setInternalNotes] = useState(item.internal_notes ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(item.category_id ?? item.store_category_override_id ?? null);
  const [dirty, setDirty] = useState(false);

  // Decoration
  const [screenPrint, setScreenPrint] = useState(item.screen_print_enabled);
  const [embroidery, setEmbroidery] = useState(item.embroidery_enabled);
  const [dtf, setDtf] = useState(item.dtf_enabled);




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
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Overview saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = () => setDirty(true);

  return (
    <div className="space-y-4">
      {/* Inherited info (read-only) */}
      <div className="p-3 bg-muted/30 rounded-lg border space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Catalog Info (read-only)</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-muted-foreground">Name:</span> {style?.style_name}</div>
          <div><span className="text-muted-foreground">Brand:</span> {style?.brand_name}</div>
          <div><span className="text-muted-foreground">Style ID:</span> {style?.style_id}</div>
        </div>
        {style?.style_image && (
          <img src={style.style_image} alt="" className="w-16 h-16 object-contain rounded mt-1" />
        )}
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Display Name (override)</Label>
          <Input value={displayName} onChange={(e) => { setDisplayName(e.target.value); m(); }} placeholder={style?.style_name || "Product name"} className="text-xs h-8" />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={active} onCheckedChange={(v) => { setActive(v); m(); }} />
          <Label className="text-xs">Active (visible on storefront)</Label>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={categoryId ?? "none"} onValueChange={(v) => { setCategoryId(v === "none" ? null : v); m(); }}>
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
          <Label className="text-xs">Customer Notes (shown on storefront)</Label>
          <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); m(); }} placeholder='e.g. "Home jersey"' rows={2} className="text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Internal Notes (admin only)</Label>
          <Textarea value={internalNotes} onChange={(e) => { setInternalNotes(e.target.value); m(); }} placeholder="Not shown to customers" rows={2} className="text-xs" />
        </div>

        {/* Decoration */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Decoration Methods</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={screenPrint} onCheckedChange={(v) => { setScreenPrint(!!v); m(); }} /> Screen Print
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={embroidery} onCheckedChange={(v) => { setEmbroidery(!!v); m(); }} /> Embroidery
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={dtf} onCheckedChange={(v) => { setDtf(!!v); m(); }} /> DTF
            </label>
          </div>
        </div>

      
      </div>

      {dirty && (
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          <Save className="w-3 h-3 mr-1" /> Save Overview
        </Button>
      )}



    </div>
  );
}

/* ─── Pricing & Fundraising Tab ─── */
function PricingTab({ item, storeId }: { item: StoreProduct; storeId: string }) {
  const queryClient = useQueryClient();

  const [priceOverride, setPriceOverride] = useState(item.price_override != null ? String(item.price_override) : "");
  const [fundraisingEnabled, setFundraisingEnabled] = useState(item.fundraising_enabled);
  const [fundraisingAmount, setFundraisingAmount] = useState(item.fundraising_amount_per_unit != null ? String(item.fundraising_amount_per_unit) : "");
  const [fundraisingPct, setFundraisingPct] = useState(item.fundraising_percentage != null ? String(item.fundraising_percentage) : "");
  const [personalizationEnabled, setPersonalizationEnabled] = useState(item.personalization_enabled);
  const [personalizationPrice, setPersonalizationPrice] = useState(item.personalization_price != null ? String(item.personalization_price) : "");
  const [personalizationConfig, setPersonalizationConfig] = useState<PersonalizationConfig>(item.personalization_config ?? { allow_name: false, allow_number: false, max_chars: 20 });
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
          personalization_enabled: personalizationEnabled,
          personalization_price: personalizationPrice.trim() ? parseFloat(personalizationPrice) : null,
          personalization_config: personalizationConfig as any,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Pricing saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = () => setDirty(true);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Price Override ($)</Label>
        <Input type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => { setPriceOverride(e.target.value); m(); }} placeholder="Leave blank for default" className="text-xs h-8 w-40" />
      </div>

      <Separator />

      {/* Fundraising */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch checked={fundraisingEnabled} onCheckedChange={(v) => { setFundraisingEnabled(v); m(); }} />
          <Label className="text-xs font-medium">Fundraising</Label>
        </div>
        {fundraisingEnabled && (
          <div className="space-y-2 pl-10">
            <div className="space-y-1">
              <Label className="text-xs">Amount per Unit ($)</Label>
              <Input type="number" step="0.01" min="0" value={fundraisingAmount} onChange={(e) => { setFundraisingAmount(e.target.value); m(); }} placeholder="e.g. 5.00" className="text-xs w-32 h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fundraising Percentage (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" value={fundraisingPct} onChange={(e) => { setFundraisingPct(e.target.value); m(); }} placeholder="e.g. 15" className="text-xs w-32 h-8" />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Personalization */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch checked={personalizationEnabled} onCheckedChange={(v) => { setPersonalizationEnabled(v); m(); }} />
          <Label className="text-xs font-medium">Personalization</Label>
        </div>
        {personalizationEnabled && (
          <div className="space-y-2 pl-10">
            <div className="space-y-1">
              <Label className="text-xs">Personalization Price ($)</Label>
              <Input type="number" step="0.01" min="0" value={personalizationPrice} onChange={(e) => { setPersonalizationPrice(e.target.value); m(); }} placeholder="e.g. 8.00" className="text-xs w-32 h-8" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={personalizationConfig.allow_name ?? false} onCheckedChange={(v) => { setPersonalizationConfig((c) => ({ ...c, allow_name: !!v })); m(); }} />
                Allow Name
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={personalizationConfig.allow_number ?? false} onCheckedChange={(v) => { setPersonalizationConfig((c) => ({ ...c, allow_number: !!v })); m(); }} />
                Allow Number
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Characters</Label>
              <Input type="number" min="1" max="100" value={personalizationConfig.max_chars ?? 20} onChange={(e) => { setPersonalizationConfig((c) => ({ ...c, max_chars: parseInt(e.target.value) || 20 })); m(); }} className="text-xs w-20 h-8" />
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          <Save className="w-3 h-3 mr-1" /> Save Pricing
        </Button>
      )}
    </div>
  );
}

/* ─── Images & Color Tab ─── */
function ImagesTab({ item, storeId }: { item: StoreProduct; storeId: string }) {
  return (
    <ProductOverridesPanel item={item} storeId={storeId} onDirty={() => {}} />
  );
}

/* ─── Variants Tab ─── */
function VariantsTab({ item, storeId }: { item: StoreProduct; storeId: string }) {
  return (
    <div className="text-center py-8">
      <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">
        Size and variant management coming soon.
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Variants are currently managed via the S&S Activewear catalog and allowed colors configuration.
      </p>
    </div>
  );
}
