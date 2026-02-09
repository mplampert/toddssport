import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, RotateCcw, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import type { ImageType } from "@/lib/productImages";

interface Props {
  item: {
    id: string;
    display_name: string | null;
    display_color: string | null;
    primary_image_url: string | null;
    primary_image_type?: string | null;
    extra_image_urls: string[] | null;
    extra_image_types?: string[] | null;
    catalog_styles?: {
      style_name: string;
      style_image: string | null;
    } | null;
  };
  storeId: string;
  onDirty: () => void;
}

const IMAGE_TYPE_OPTIONS: { value: ImageType; label: string }[] = [
  { value: "lifestyle", label: "Human / Lifestyle" },
  { value: "flat", label: "Apparel-only / Flat" },
  { value: "mockup", label: "Mockup" },
];

export function ProductOverridesPanel({ item, storeId, onDirty }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(item.display_name ?? "");
  const [displayColor, setDisplayColor] = useState(item.display_color ?? "");
  const [primaryImage, setPrimaryImage] = useState(item.primary_image_url ?? "");
  const [primaryImageType, setPrimaryImageType] = useState<ImageType>(
    (item.primary_image_type as ImageType) || "flat"
  );
  const [extraImages, setExtraImages] = useState<string[]>(
    Array.isArray(item.extra_image_urls) ? item.extra_image_urls : []
  );
  const [extraImageTypes, setExtraImageTypes] = useState<ImageType[]>(
    Array.isArray(item.extra_image_types)
      ? (item.extra_image_types as ImageType[])
      : (Array.isArray(item.extra_image_urls) ? item.extra_image_urls.map(() => "flat" as ImageType) : [])
  );
  const [uploading, setUploading] = useState(false);

  const defaultName = item.catalog_styles?.style_name ?? "Product";
  const defaultImage = item.catalog_styles?.style_image ?? "";

  async function uploadFile(file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${storeId}/${item.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("store-product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("store-product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePrimaryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setPrimaryImage(url);
      onDirty();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExtraUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setExtraImages((prev) => [...prev, url]);
      setExtraImageTypes((prev) => [...prev, "lifestyle"]);
      onDirty();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (extraFileRef.current) extraFileRef.current.value = "";
    }
  }

  function removeExtraImage(idx: number) {
    setExtraImages((prev) => prev.filter((_, i) => i !== idx));
    setExtraImageTypes((prev) => prev.filter((_, i) => i !== idx));
    onDirty();
  }

  function updateExtraImageType(idx: number, type: ImageType) {
    setExtraImageTypes((prev) => {
      const next = [...prev];
      next[idx] = type;
      return next;
    });
    onDirty();
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          display_name: displayName.trim() || null,
          display_color: displayColor.trim() || null,
          primary_image_url: primaryImage.trim() || null,
          primary_image_type: primaryImageType,
          extra_image_urls: extraImages.length > 0 ? extraImages : [],
          extra_image_types: extraImageTypes.length > 0 ? extraImageTypes : [],
        } as any)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor"] });
      toast.success("Overrides saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-xl">
      <Label className="text-sm font-semibold">Store Display Overrides</Label>

      {/* Display Name */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Display Name</Label>
        <Input
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); onDirty(); }}
          placeholder={defaultName}
          className="text-xs h-8"
        />
        {displayName.trim() && (
          <button
            onClick={() => { setDisplayName(""); onDirty(); }}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reset to default
          </button>
        )}
      </div>

      {/* Display Color */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Display Color</Label>
        <Input
          value={displayColor}
          onChange={(e) => { setDisplayColor(e.target.value); onDirty(); }}
          placeholder='e.g. "Navy/White"'
          className="text-xs h-8"
        />
        {displayColor.trim() && (
          <button
            onClick={() => { setDisplayColor(""); onDirty(); }}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reset to default
          </button>
        )}
      </div>

      {/* Primary Image */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Primary Image</Label>
        <div className="flex items-start gap-3">
          <div className="w-20 h-20 border rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={primaryImage || defaultImage || "/placeholder.svg"}
              alt="Primary"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                Upload
              </Button>
              {primaryImage && (
                <button
                  onClick={() => { setPrimaryImage(""); onDirty(); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Type:</Label>
              <Select
                value={primaryImageType}
                onValueChange={(v) => { setPrimaryImageType(v as ImageType); onDirty(); }}
              >
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePrimaryUpload} />
        </div>
      </div>

      {/* Extra Images */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Additional Images</Label>
        <div className="space-y-2">
          {extraImages.map((url, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 border rounded bg-muted/30">
              <div className="w-12 h-12 border rounded bg-muted overflow-hidden shrink-0">
                <img src={url} alt={`Extra ${i + 1}`} className="w-full h-full object-contain p-0.5" />
              </div>
              <Select
                value={extraImageTypes[i] || "lifestyle"}
                onValueChange={(v) => updateExtraImageType(i, v as ImageType)}
              >
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => removeExtraImage(i)}
                className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => extraFileRef.current?.click()}
            className="w-full h-10 border-2 border-dashed rounded flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Add Image
          </button>
          <input ref={extraFileRef} type="file" accept="image/*" className="hidden" onChange={handleExtraUpload} />
        </div>
      </div>

      {/* Save overrides */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="text-xs"
      >
        {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        Save Overrides
      </Button>
    </div>
  );
}
