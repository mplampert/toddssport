import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, Save, Info, Plus, X, Wand2, Loader2, ImageIcon, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HeroGenerator } from "@/components/admin/team-stores/HeroGenerator";
import { StoreMessagesManager } from "@/components/admin/team-stores/StoreMessagesManager";

const MAX_COLORS = 4;
const HEX_PATTERN = /^#[0-9A-Fa-f]{0,6}$/;

function normalizeHex(val: unknown): string | null {
  if (typeof val === "string") {
    const s = val.trim().toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(s)) return s;
    if (/^[0-9A-F]{6}$/.test(s)) return `#${s}`;
  }
  if (val && typeof val === "object" && "hex" in (val as any)) {
    return normalizeHex((val as any).hex);
  }
  return null;
}

function normalizeBrandColors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeHex).filter(Boolean) as string[];
}

export default function StoreBranding() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();

  // Load store branding data
  const { data: storeData, isLoading, error } = useQuery({
    queryKey: ["store-branding", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, brand_colors, logo_url")
        .eq("id", store.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load primary logo from store_logos
  const { data: primaryLogo, isLoading: logoLoading } = useQuery({
    queryKey: ["store-primary-logo", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_logos")
        .select("id, name, file_url, is_primary")
        .eq("team_store_id", store.id)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (storeData) {
      setBrandColors(normalizeBrandColors(storeData.brand_colors));
      setLogoUrl(storeData.logo_url ?? "");
      setHasChanges(false);
    }
  }, [storeData]);

  const storeName = storeData?.name || store.name;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ colors, logo }: { colors: string[]; logo: string }) => {
      const normalized = colors.map((c) => c.toUpperCase());
      const { error } = await supabase
        .from("team_stores")
        .update({ brand_colors: normalized, logo_url: logo || null })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-branding", store.id] });
      queryClient.invalidateQueries({ queryKey: ["team-store"] });
      toast.success("Branding saved");
      setHasChanges(false);
    },
    onError: (e: Error) => toast.error(`Failed to save: ${e.message}`),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${store.id}/store-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("store-logos")
        .getPublicUrl(path);
      setLogoUrl(publicUrl);
      setHasChanges(true);
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ colors: brandColors, logo: logoUrl });
  };

  const updateColor = (index: number, value: string) => {
    if (!HEX_PATTERN.test(value)) return;
    setBrandColors((prev) => {
      const next = [...prev];
      next[index] = value.toUpperCase();
      return next;
    });
    setHasChanges(true);
  };

  const updateColorFromPicker = (index: number, value: string) => {
    setBrandColors((prev) => {
      const next = [...prev];
      next[index] = value.toUpperCase();
      return next;
    });
    setHasChanges(true);
  };

  const removeColor = (index: number) => {
    setBrandColors((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addColor = () => {
    if (brandColors.length >= MAX_COLORS) return;
    setBrandColors((prev) => [...prev, "#000000"]);
    setHasChanges(true);
  };

  const extractColors = async () => {
    if (!primaryLogo?.file_url) {
      toast.error("No primary logo found. Set a primary logo first.");
      return;
    }
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-logo-colors", {
        body: { imageUrl: primaryLogo.file_url },
      });
      if (error) throw error;

      const extracted = normalizeBrandColors(data?.colors || []).slice(0, MAX_COLORS);
      if (extracted.length > 0) {
        setBrandColors(extracted);
        setHasChanges(true);
        toast.success(`Pulled ${extracted.length} brand color(s) from the logo.`);
      } else {
        toast.info("No colors could be extracted from that logo.");
      }
    } catch (e: any) {
      toast.error(`Failed to extract colors: ${e.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading branding for this team store…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        <p>Failed to load branding: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {storeName} Branding
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Set the colors and logos that make this team store feel like your school, club, or organization.
        </p>
      </div>

      {/* Store Logo Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Store Logo
          </CardTitle>
          <CardDescription>
            The primary logo displayed on the storefront header and hero section. This is your school, club, or organization's main logo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            {logoUrl ? (
              <div className="w-28 h-28 rounded-lg border border-border bg-muted flex items-center justify-center p-2 shrink-0 relative group">
                <img src={logoUrl} alt="Store logo" className="max-w-full max-h-full object-contain" />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                  aria-label="Remove logo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-28 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-muted-foreground/60 transition-colors">
                {isUploadingLogo ? (
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground/50 mb-1" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
              </label>
            )}
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>Or paste a logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setHasChanges(true); }}
                  placeholder="https://..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This logo appears on the storefront hero, header, and marketing materials.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>
              These colors drive product mockups, buttons, and accents for this store's pages and marketing.
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            size="sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveMutation.isPending ? "Saving…" : "Save Branding"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info row */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Use 2–4 strong brand colors (home, away, and accent). Avoid too many similar shades so mockups stay clean.
            </span>
          </div>

          {/* Color swatches */}
          <div className="flex flex-wrap gap-4 items-end">
            {brandColors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColorFromPicker(i, e.target.value)}
                    className="w-10 h-10 rounded-md cursor-pointer border border-border p-0.5"
                  />
                  <button
                    onClick={() => removeColor(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    type="button"
                    aria-label="Remove color"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <Input
                  value={color}
                  onChange={(e) => updateColor(i, e.target.value)}
                  maxLength={7}
                  className="w-24 font-mono text-xs"
                />
              </div>
            ))}

            {/* Add color tile */}
            {brandColors.length < MAX_COLORS && (
              <button
                onClick={addColor}
                className="w-10 h-10 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/60 transition-colors"
                type="button"
                aria-label="Add color"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Helper text */}
          {brandColors.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No brand colors set yet. Add up to 4 colors or pull them from your primary logo.
            </p>
          )}
          {brandColors.length >= MAX_COLORS && (
            <p className="text-xs text-muted-foreground">
              You've reached the maximum of 4 brand colors for this store.
            </p>
          )}

          {/* Extract colors button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={extractColors}
              disabled={isExtracting || logoLoading || !primaryLogo?.file_url}
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {isExtracting ? "Extracting…" : "Pull Colors From Logo"}
            </Button>
            {!logoLoading && !primaryLogo && (
              <span className="text-xs text-muted-foreground">
                Set a primary logo below to automatically pull its colors.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Hero Generator */}
      <HeroGenerator storeId={store.id} storeName={storeName} brandColors={brandColors} />

      {/* Store Messages */}
      <StoreMessagesManager storeId={store.id} />

    </div>
  );
}
