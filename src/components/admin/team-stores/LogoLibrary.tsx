import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Store, Trash2, Plus, ChevronDown, ChevronRight, Star, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/store-logos/${path}`;
}

/** Detect file type from extension */
function detectFileType(filename: string): "svg" | "ai" | "eps" | "image" {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "svg") return "svg";
  if (ext === "ai") return "ai";
  if (ext === "eps") return "eps";
  return "image";
}

/** File type badge labels */
const FILE_TYPE_LABELS: Record<string, string> = {
  svg: "SVG",
  ai: "AI",
  eps: "EPS",
  image: "Raster",
};

const PLACEMENTS = [
  { value: "left_front", label: "Left Front / Left Chest" },
  { value: "right_front", label: "Right Front / Right Chest" },
  { value: "center_front", label: "Center Front" },
  { value: "full_front", label: "Full Front" },
  { value: "full_back", label: "Full Back" },
  { value: "upper_back", label: "Upper Back" },
  { value: "left_sleeve", label: "Left Sleeve" },
  { value: "right_sleeve", label: "Right Sleeve" },
  { value: "hat_front", label: "Hat Front" },
  { value: "hat_side", label: "Hat Side" },
  { value: "left_leg", label: "Left Leg" },
  { value: "right_leg", label: "Right Leg" },
];

const BACKGROUND_RULES = [
  { value: "any", label: "Any Background" },
  { value: "light_only", label: "Light Garments Only" },
  { value: "dark_only", label: "Dark Garments Only" },
];

const COLORWAYS = [
  "black", "white", "red", "navy", "royal", "gold", "green", "orange", "purple", "grey", "multi",
];

interface LogoVariant {
  id: string;
  store_logo_id: string;
  name: string;
  colorway: string;
  file_url: string;
  screen_print_enabled: boolean;
  embroidery_enabled: boolean;
  dtf_enabled: boolean;
  background_rule: string;
  is_default: boolean;
}

interface MasterLogo {
  id: string;
  name: string;
  method: string;
  placement: string | null;
  file_url: string;
  is_primary: boolean;
  variants: LogoVariant[];
}

interface LogoLibraryProps {
  storeId: string;
  logoUrl?: string | null;
}

export function LogoLibrary({ storeId, logoUrl }: LogoLibraryProps) {
  const queryClient = useQueryClient();
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const decoInputRef = useRef<HTMLInputElement>(null);
  const variantInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedLogos, setExpandedLogos] = useState<Set<string>>(new Set());

  const [decoName, setDecoName] = useState("");
  const [decoPlacement, setDecoPlacement] = useState("left_front");

  const [variantDialog, setVariantDialog] = useState<{ logoId: string; logoName: string } | null>(null);
  const [variantName, setVariantName] = useState("");
  const [variantColorway, setVariantColorway] = useState("black");
  const [variantScreenPrint, setVariantScreenPrint] = useState(false);
  const [variantEmbroidery, setVariantEmbroidery] = useState(false);
  const [variantDtf, setVariantDtf] = useState(false);
  const [variantBgRule, setVariantBgRule] = useState("any");
  const [variantIsDefault, setVariantIsDefault] = useState(false);

  const uploadPrimaryLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${storeId}/primary.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      const { error } = await supabase
        .from("team_stores")
        .update({ logo_url: publicUrl })
        .eq("id", storeId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-team-store", storeId] });
      toast.success("Primary logo uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const { data: masterLogos = [] } = useQuery<MasterLogo[]>({
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
  });

  const uploadDecoLogo = async (file: File) => {
    if (!decoName.trim()) {
      toast.error("Please enter a logo name first");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileType = detectFileType(file.name);
      const path = `${storeId}/deco-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      const isVector = fileType !== "image";
      const { data: newLogo, error } = await supabase.from("store_logos").insert({
        team_store_id: storeId,
        name: decoName.trim(),
        method: "multi",
        placement: decoPlacement,
        file_url: publicUrl,
        file_type: fileType,
        original_file_url: isVector ? publicUrl : null,
      } as any).select("id").single();
      if (error) throw error;

      await supabase.from("store_logo_variants").insert({
        store_logo_id: newLogo.id,
        name: "Default",
        colorway: "original",
        file_url: publicUrl,
        screen_print_enabled: true,
        embroidery_enabled: false,
        dtf_enabled: false,
        background_rule: "any",
        is_default: true,
        file_type: fileType,
        original_file_url: isVector ? publicUrl : null,
      } as any);

      queryClient.invalidateQueries({ queryKey: ["store-logos-with-variants", storeId] });
      setDecoName("");
      toast.success(`Logo added (${FILE_TYPE_LABELS[fileType]}) with default variant`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteLogoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_logos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-logos-with-variants", storeId] });
      toast.success("Logo and all variants removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_logo_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-logos-with-variants", storeId] });
      toast.success("Variant removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (logoId: string) => {
      // Unset all primary flags for this store
      await supabase.from("store_logos").update({ is_primary: false }).eq("team_store_id", storeId);
      // Set the selected logo as primary
      const { error } = await supabase.from("store_logos").update({ is_primary: true }).eq("id", logoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-logos-with-variants", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-primary-logo", storeId] });
      toast.success("Primary logo updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addVariant = async (file: File) => {
    if (!variantDialog || !variantName.trim()) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileType = detectFileType(file.name);
      const isVector = fileType !== "image";
      const path = `${storeId}/variant-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);

      if (variantIsDefault) {
        await supabase
          .from("store_logo_variants")
          .update({ is_default: false })
          .eq("store_logo_id", variantDialog.logoId);
      }

      const { error } = await supabase.from("store_logo_variants").insert({
        store_logo_id: variantDialog.logoId,
        name: variantName.trim(),
        colorway: variantColorway,
        file_url: publicUrl,
        screen_print_enabled: variantScreenPrint,
        embroidery_enabled: variantEmbroidery,
        dtf_enabled: variantDtf,
        background_rule: variantBgRule,
        is_default: variantIsDefault,
        file_type: fileType,
        original_file_url: isVector ? publicUrl : null,
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["store-logos-with-variants", storeId] });
      toast.success(`Variant added (${FILE_TYPE_LABELS[fileType]})`);
      setVariantDialog(null);
      resetVariantForm();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const resetVariantForm = () => {
    setVariantName("");
    setVariantColorway("black");
    setVariantScreenPrint(false);
    setVariantEmbroidery(false);
    setVariantDtf(false);
    setVariantBgRule("any");
    setVariantIsDefault(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const decorationBadges = (v: LogoVariant) => {
    const methods: string[] = [];
    if (v.screen_print_enabled) methods.push("Screen Print");
    if (v.embroidery_enabled) methods.push("Embroidery");
    if (v.dtf_enabled) methods.push("DTF");
    return methods;
  };

  return (
    <div className="space-y-4">
      {/* Primary Logo */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-sm font-medium">Primary Store Logo</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-background flex items-center justify-center border shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Primary logo" className="max-w-full max-h-full object-contain p-1" />
            ) : (
              <Store className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={primaryInputRef}
              type="file"
              accept="image/*,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPrimaryLogo(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => primaryInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {uploading ? "Uploading…" : logoUrl ? "Replace Logo" : "Upload Logo"}
            </Button>
            <p className="text-xs text-muted-foreground">Used as the store hero and avatar.</p>
          </div>
        </div>
      </div>

      {/* Add new decoration logo */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-sm font-medium">Add New Decoration Logo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Logo Name</Label>
            <Input
              value={decoName}
              onChange={(e) => setDecoName(e.target.value)}
              placeholder='e.g. "Panthers Logo"'
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default Placement</Label>
            <Select value={decoPlacement} onValueChange={setDecoPlacement}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLACEMENTS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <input
          ref={decoInputRef}
          type="file"
            accept="image/*,.svg,.ai,.eps"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadDecoLogo(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          onClick={() => decoInputRef.current?.click()}
          disabled={uploading || !decoName.trim()}
        >
          <Plus className="w-4 h-4 mr-2" />
          {uploading ? "Uploading…" : "Upload & Add Logo"}
        </Button>
        <p className="text-xs text-muted-foreground">Accepts SVG, AI, EPS, PNG, JPG. Vector files are kept as originals for production.</p>
      </div>

      {/* Existing logos list */}
      {masterLogos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No decoration logos yet.</p>
      ) : (
        <div className="space-y-3">
          {masterLogos.map((logo) => {
            const isExpanded = expandedLogos.has(logo.id);
            return (
              <div key={logo.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(logo.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border shrink-0">
                      <img src={logo.file_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{logo.name}</p>
                        {logo.is_primary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Star className="w-2.5 h-2.5 mr-0.5" /> Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {(logo.placement || "left_front").replace(/_/g, " ")} · {logo.variants.length} variant{logo.variants.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!logo.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(logo.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        <Star className="w-3 h-3 mr-1" /> Set Primary
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVariantDialog({ logoId: logo.id, logoName: logo.name });
                        resetVariantForm();
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Variant
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete "${logo.name}" and all its variants?`)) {
                          deleteLogoMutation.mutate(logo.id);
                        }
                      }}
                      disabled={deleteLogoMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/10 divide-y">
                    {logo.variants.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No variants yet. Add one to assign this logo to products.</p>
                    ) : (
                      logo.variants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between px-4 py-2.5 pl-12">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white border flex items-center justify-center shrink-0">
                              <img src={v.file_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{v.name}</p>
                                {v.is_default && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    <Star className="w-2.5 h-2.5 mr-0.5" /> Default
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] capitalize">{v.colorway}</Badge>
                                {decorationBadges(v).map((m) => (
                                  <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                                ))}
                                <Badge variant="outline" className="text-[10px]">
                                  {BACKGROUND_RULES.find((r) => r.value === v.background_rule)?.label || v.background_rule}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteVariantMutation.mutate(v.id)}
                            disabled={deleteVariantMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Variant Dialog */}
      <Dialog open={!!variantDialog} onOpenChange={(v) => { if (!v) setVariantDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Variant — {variantDialog?.logoName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Variant Name</Label>
              <Input
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder='e.g. "White on Dark"'
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Colorway</Label>
              <Select value={variantColorway} onValueChange={setVariantColorway}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORWAYS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Background Rule</Label>
              <Select value={variantBgRule} onValueChange={setVariantBgRule}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BACKGROUND_RULES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Decoration Methods</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={variantScreenPrint} onCheckedChange={setVariantScreenPrint} />
                  <Label className="text-sm font-normal">Screen Print</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={variantEmbroidery} onCheckedChange={setVariantEmbroidery} />
                  <Label className="text-sm font-normal">Embroidery</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={variantDtf} onCheckedChange={setVariantDtf} />
                  <Label className="text-sm font-normal">DTF</Label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={variantIsDefault} onCheckedChange={setVariantIsDefault} />
              <Label className="text-sm font-normal">Set as default variant</Label>
            </div>
          </div>
          <DialogFooter>
            <input
              ref={variantInputRef}
              type="file"
              accept="image/*,.svg,.ai,.eps"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addVariant(file);
                e.target.value = "";
              }}
            />
            <Button
              onClick={() => variantInputRef.current?.click()}
              disabled={uploading || !variantName.trim()}
              className="btn-cta"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading…" : "Upload Variant File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
