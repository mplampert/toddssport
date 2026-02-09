import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Layers } from "lucide-react";
import { toast } from "sonner";

interface LogoVariant {
  id: string;
  store_logo_id: string;
  name: string;
  colorway: string;
  file_url: string;
  background_rule: string;
  is_default: boolean;
}

interface MasterLogo {
  id: string;
  name: string;
  file_url: string;
  is_primary: boolean;
  method: string;
  variants: LogoVariant[];
}

interface Props {
  storeId: string;
  selectedProductIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLACEMENT_PRESETS = [
  { value: "left_chest", label: "Left Chest", x: 0.35, y: 0.25, scale: 0.15 },
  { value: "center_front", label: "Center Front", x: 0.5, y: 0.3, scale: 0.25 },
  { value: "full_front", label: "Full Front", x: 0.5, y: 0.35, scale: 0.45 },
  { value: "full_back", label: "Full Back", x: 0.5, y: 0.35, scale: 0.45 },
  { value: "upper_back", label: "Upper Back", x: 0.5, y: 0.15, scale: 0.2 },
  { value: "left_sleeve", label: "Left Sleeve", x: 0.15, y: 0.3, scale: 0.1 },
  { value: "right_sleeve", label: "Right Sleeve", x: 0.85, y: 0.3, scale: 0.1 },
  { value: "hat_front", label: "Hat Front", x: 0.5, y: 0.35, scale: 0.3 },
];

export function BulkAssignLogosDialog({ storeId, selectedProductIds, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedPlacement, setSelectedPlacement] = useState("left_chest");
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
  const [autoPickByColor, setAutoPickByColor] = useState(true);
  const [isPrimary, setIsPrimary] = useState(true);

  // Fetch master logos with variants
  const { data: masterLogos = [], isLoading } = useQuery<MasterLogo[]>({
    queryKey: ["store-logos-with-variants", storeId],
    queryFn: async () => {
      const { data: logos, error } = await supabase
        .from("store_logos")
        .select("*")
        .eq("team_store_id", storeId)
        .order("name");
      if (error) throw error;

      const logoIds = (logos || []).map((l: any) => l.id);
      let variants: any[] = [];
      if (logoIds.length > 0) {
        const { data: v, error: vErr } = await supabase
          .from("store_logo_variants")
          .select("*")
          .in("store_logo_id", logoIds);
        if (vErr) throw vErr;
        variants = v || [];
      }

      return (logos || []).map((logo: any) => ({
        ...logo,
        variants: variants
          .filter((v: any) => v.store_logo_id === logo.id)
          .sort((a: any, b: any) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)),
      }));
    },
    enabled: open,
  });

  const selectedLogo = masterLogos.find((l) => l.id === selectedLogoId);
  const preset = PLACEMENT_PRESETS.find((p) => p.value === selectedPlacement) || PLACEMENT_PRESETS[0];

  const toggleVariant = (id: string) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      // Determine which variant to use
      let variantId: string | null = null;
      if (selectedLogo && selectedLogo.variants.length > 0) {
        if (autoPickByColor) {
          // Use default variant; storefront will auto-pick per color
          const def = selectedLogo.variants.find((v) => v.is_default) || selectedLogo.variants[0];
          variantId = def.id;
        } else if (selectedVariantIds.size === 1) {
          variantId = Array.from(selectedVariantIds)[0];
        } else if (selectedVariantIds.size > 0) {
          variantId = Array.from(selectedVariantIds)[0];
        } else {
          const def = selectedLogo.variants.find((v) => v.is_default) || selectedLogo.variants[0];
          variantId = def?.id || null;
        }
      }

      const rows = selectedProductIds.map((pid) => ({
        team_store_item_id: pid,
        store_logo_id: selectedLogoId!,
        store_logo_variant_id: variantId,
        position: selectedPlacement,
        x: preset.x,
        y: preset.y,
        scale: preset.scale,
        is_primary: isPrimary,
        variant_color: null as string | null,
        variant_size: null as string | null,
      }));

      // Upsert: remove existing logos at this placement for selected products, then insert
      for (const pid of selectedProductIds) {
        await supabase
          .from("team_store_item_logos")
          .delete()
          .eq("team_store_item_id", pid)
          .eq("position", selectedPlacement)
          .is("variant_color", null);
      }

      const { error } = await supabase.from("team_store_item_logos").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-logos"] });
      queryClient.invalidateQueries({ queryKey: ["storefront-product-logos", storeId] });
      queryClient.invalidateQueries({ queryKey: ["ts-product-detail"] });
      toast.success(`Logo assigned to ${selectedProductIds.length} product(s)`);
      onOpenChange(false);
      resetState();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetState = () => {
    setStep(1);
    setSelectedLogoId(null);
    setSelectedVariantIds(new Set());
    setAutoPickByColor(true);
    setIsPrimary(true);
    setSelectedPlacement("left_chest");
  };

  const canProceedStep1 = !!selectedPlacement;
  const canProceedStep2 = !!selectedLogoId;
  const canSubmit = !!selectedLogoId && !!selectedPlacement;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Bulk Assign Logo — {selectedProductIds.length} Product{selectedProductIds.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Assign a logo and placement to all selected products at once.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => { if (s < step || (s === 2 && canProceedStep1) || (s === 3 && canProceedStep2)) setStep(s); }}
                  className={`px-2 py-1 rounded ${step === s ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted"}`}
                >
                  {s}. {s === 1 ? "Placement" : s === 2 ? "Logo" : "Options"}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Placement Preset</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLACEMENT_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPlacement(p.value)}
                      className={`text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                        selectedPlacement === p.value
                          ? "border-accent bg-accent/10 font-medium"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Logo</Label>
                {masterLogos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logos in this store. Add logos first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                    {masterLogos.map((logo) => (
                      <button
                        key={logo.id}
                        onClick={() => {
                          setSelectedLogoId(logo.id);
                          setSelectedVariantIds(new Set());
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                          selectedLogoId === logo.id
                            ? "border-accent bg-accent/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="w-16 h-16 bg-muted/30 rounded flex items-center justify-center border p-1">
                          <img src={logo.file_url} alt={logo.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium truncate max-w-[100px]">{logo.name}</p>
                          <p className="text-[10px] text-muted-foreground">{logo.variants.length} variant{logo.variants.length !== 1 ? "s" : ""}</p>
                        </div>
                        {logo.is_primary && (
                          <Badge variant="secondary" className="text-[9px] px-1 h-4">Primary</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show variants for selected logo */}
                {selectedLogo && selectedLogo.variants.length > 1 && (
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <Label className="text-xs font-semibold">Logo Variants</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedLogo.variants.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 border rounded px-2 py-1.5 bg-card">
                          <img src={v.file_url} alt={v.name} className="w-6 h-6 object-contain" />
                          <span className="text-xs">{v.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 h-4 capitalize">{v.colorway}</Badge>
                          {v.is_default && <Badge variant="secondary" className="text-[8px] px-1 h-3.5">Default</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Options</Label>

                  {/* Auto-pick toggle */}
                  {selectedLogo && selectedLogo.variants.length > 1 && (
                    <div className="flex items-center justify-between border rounded-lg p-3 bg-card">
                      <div>
                        <p className="text-sm font-medium">Auto-select variant by garment color</p>
                        <p className="text-xs text-muted-foreground">
                          Dark garments → white logo, light garments → black logo
                        </p>
                      </div>
                      <Switch checked={autoPickByColor} onCheckedChange={setAutoPickByColor} />
                    </div>
                  )}

                  {/* Manual variant selection when auto-pick is off */}
                  {selectedLogo && selectedLogo.variants.length > 1 && !autoPickByColor && (
                    <div className="border rounded-lg p-3 space-y-2 bg-card">
                      <Label className="text-xs font-semibold">Choose variant to apply</Label>
                      {selectedLogo.variants.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedVariantIds.has(v.id)}
                            onCheckedChange={() => toggleVariant(v.id)}
                          />
                          <img src={v.file_url} alt="" className="w-5 h-5 object-contain" />
                          <span className="text-xs">{v.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 h-4 capitalize">{v.colorway}</Badge>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Primary toggle */}
                  <div className="flex items-center gap-2">
                    <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                    <Label className="text-sm">Set as primary logo for these products</Label>
                  </div>
                </div>

                {/* Summary */}
                <div className="border rounded-lg p-3 bg-muted/20 text-xs space-y-1">
                  <p><strong>Products:</strong> {selectedProductIds.length}</p>
                  <p><strong>Placement:</strong> {preset.label}</p>
                  <p><strong>Logo:</strong> {selectedLogo?.name}</p>
                  <p><strong>Variant:</strong> {autoPickByColor ? "Auto by garment color" : `${selectedVariantIds.size} selected`}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => bulkAssignMutation.mutate()}
              disabled={!canSubmit || bulkAssignMutation.isPending}
            >
              {bulkAssignMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Assign to {selectedProductIds.length} Product{selectedProductIds.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
