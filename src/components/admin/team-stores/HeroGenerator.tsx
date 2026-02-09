import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Wand2, RefreshCw, Download, Save, Loader2, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

const SPORTS = [
  "baseball", "basketball", "cheerleading", "football", "golf", "hockey",
  "lacrosse", "soccer", "softball", "swimming", "tennis", "track",
  "volleyball", "wrestling", "general athletics",
];

const HERO_STYLES: { value: string; label: string; description: string }[] = [
  { value: "clean_minimal", label: "Clean & Minimal", description: "Modern, simple geometric shapes with plenty of whitespace" },
  { value: "grunge", label: "Grunge", description: "Textured, gritty, raw and edgy with distressed elements" },
  { value: "neon", label: "Neon & Electric", description: "Glowing neon lights, vibrant energy, dark backgrounds" },
  { value: "stadium", label: "Stadium Lights", description: "Dramatic stadium lighting, bokeh, field atmosphere" },
  { value: "retro", label: "Retro / Vintage", description: "Classic sports aesthetic, worn textures, nostalgic feel" },
  { value: "dynamic", label: "Dynamic Action", description: "Motion blur, speed lines, high-energy compositions" },
  { value: "corporate", label: "Corporate Professional", description: "Sleek, polished, business-appropriate branding" },
];

interface Props {
  storeId: string;
  storeName: string;
  brandColors: string[];
}

export function HeroGenerator({ storeId, storeName, brandColors }: Props) {
  const queryClient = useQueryClient();

  // Load store hero-related fields
  const { data: storeData, isLoading } = useQuery({
    queryKey: ["store-hero-fields", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("sport, mascot_name, hero_style, hero_image_url, store_type")
        .eq("id", storeId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [sport, setSport] = useState("");
  const [mascotName, setMascotName] = useState("");
  const [heroStyle, setHeroStyle] = useState("clean_minimal");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [hasFieldChanges, setHasFieldChanges] = useState(false);

  useEffect(() => {
    if (storeData) {
      setSport((storeData as any).sport || "");
      setMascotName((storeData as any).mascot_name || "");
      setHeroStyle((storeData as any).hero_style || "clean_minimal");
      setHeroImageUrl(storeData.hero_image_url || null);
      setHasFieldChanges(false);
    }
  }, [storeData]);

  // Save fields mutation
  const saveFieldsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          sport: sport || null,
          mascot_name: mascotName || null,
          hero_style: heroStyle,
        } as any)
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-hero-fields", storeId] });
      toast.success("Hero settings saved");
      setHasFieldChanges(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Generate hero image mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-store-hero", {
        body: {
          storeName,
          storeType: storeData?.store_type || "spirit_wear",
          sport: sport || null,
          mascotName: mascotName || null,
          heroStyle: heroStyle,
          brandColors: brandColors.length > 0 ? brandColors : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.heroImageUrl as string;
    },
    onSuccess: async (url) => {
      setHeroImageUrl(url);
      // Save URL to DB
      const { error } = await supabase
        .from("team_stores")
        .update({ hero_image_url: url })
        .eq("id", storeId);
      if (error) {
        toast.error("Image generated but failed to save: " + error.message);
      } else {
        queryClient.invalidateQueries({ queryKey: ["store-hero-fields", storeId] });
        queryClient.invalidateQueries({ queryKey: ["admin-team-store", storeId] });
        toast.success("Hero image generated and saved!");
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to generate hero image");
    },
  });

  // Remove hero image
  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({ hero_image_url: null })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      setHeroImageUrl(null);
      queryClient.invalidateQueries({ queryKey: ["store-hero-fields", storeId] });
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", storeId] });
      toast.success("Hero image removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDownload = () => {
    if (!heroImageUrl) return;
    const a = document.createElement("a");
    a.href = heroImageUrl;
    a.download = `${storeName.replace(/\s+/g, "-").toLowerCase()}-hero.jpg`;
    a.target = "_blank";
    a.click();
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          AI Hero Image
        </CardTitle>
        <CardDescription>
          Generate a custom hero banner for this store's homepage. The AI creates branded backgrounds based on your sport, style, and colors—no text or logos baked in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            The generated image is a wide background (16:9). Your store name, logo, and CTA stay as editable HTML text on top for fast load times and crisp rendering on all devices.
          </span>
        </div>

        {/* Fields row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Sport</Label>
            <Select
              value={sport}
              onValueChange={(v) => { setSport(v); setHasFieldChanges(true); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sport…" />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Team / Mascot Name</Label>
            <Input
              value={mascotName}
              onChange={(e) => { setMascotName(e.target.value); setHasFieldChanges(true); }}
              placeholder="e.g. Boston Moxie"
            />
          </div>
          <div className="space-y-2">
            <Label>Hero Style</Label>
            <Select
              value={heroStyle}
              onValueChange={(v) => { setHeroStyle(v); setHasFieldChanges(true); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HERO_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">— {s.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save fields + Generate buttons */}
        <div className="flex flex-wrap gap-3">
          {hasFieldChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveFieldsMutation.mutate()}
              disabled={saveFieldsMutation.isPending}
            >
              {saveFieldsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : heroImageUrl ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            {generateMutation.isPending
              ? "Generating…"
              : heroImageUrl
                ? "Regenerate Hero"
                : "Generate Hero Image"}
          </Button>
        </div>

        {/* Preview */}
        {heroImageUrl && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img
                src={heroImageUrl}
                alt="Generated hero banner"
                className="w-full aspect-[16/9] object-cover"
              />
              {/* Overlay preview showing how text looks on top */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
                <div className="p-6 md:p-10 max-w-md">
                  <p className="text-white/90 text-xs uppercase tracking-widest mb-1">Preview</p>
                  <h3 className="text-white text-2xl md:text-3xl font-black leading-tight">
                    {storeName}
                  </h3>
                  <p className="text-white/80 text-sm mt-2">
                    Your store headline and CTA appear as HTML text over this background.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
