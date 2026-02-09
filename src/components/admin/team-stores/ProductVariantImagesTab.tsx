import { useState, useRef, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, Star, AlertTriangle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useProductVariantImages,
  useDeleteVariantImage,
  useSetPrimaryVariantImage,
  groupByColor,
  type VariantImage,
} from "@/hooks/useVariantImages";

interface Props {
  item: {
    id: string;
    allowed_colors?: any;
    display_name?: string | null;
    catalog_styles?: { style_name?: string } | null;
  };
  storeId: string;
}

const IMAGE_TYPE_OPTIONS = [
  { value: "lifestyle", label: "Human / Lifestyle" },
  { value: "flat", label: "Apparel-only / Flat" },
  { value: "mockup", label: "Mockup" },
];

const VIEW_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "left_sleeve", label: "Left Sleeve" },
  { value: "right_sleeve", label: "Right Sleeve" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "detail", label: "Detail" },
];

export function ProductVariantImagesTab({ item, storeId }: Props) {
  const queryClient = useQueryClient();
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: variantImages = [], isLoading } = useProductVariantImages(item.id);
  const deleteMut = useDeleteVariantImage();
  const setPrimaryMut = useSetPrimaryVariantImage();

  // Get enabled colors from allowed_colors
  const enabledColors = useMemo(() => {
    if (!Array.isArray(item.allowed_colors) || item.allowed_colors.length === 0) {
      return [] as { code: string; name: string }[];
    }
    return item.allowed_colors as { code: string; name: string }[];
  }, [item.allowed_colors]);

  const imagesByColor = useMemo(() => groupByColor(variantImages), [variantImages]);

  // Colors that have NO images assigned → show warning
  const colorsWithoutImages = useMemo(() => {
    return enabledColors.filter((c) => !imagesByColor.has(c.name) || imagesByColor.get(c.name)!.length === 0);
  }, [enabledColors, imagesByColor]);

  async function uploadFile(file: File, color: string): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${storeId}/${item.id}/variants/${color.replace(/\s+/g, "-")}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("store-product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("store-product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleUpload(color: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(color);
    try {
      const url = await uploadFile(file, color);
      const existing = imagesByColor.get(color) || [];
      const { error } = await supabase
        .from("team_store_product_variant_images")
        .insert({
          team_store_product_id: item.id,
          color,
          image_url: url,
          image_type: "flat",
          view: "front",
          is_primary: existing.length === 0,
          sort_order: existing.length,
        } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
      toast.success(`Image added for ${color}`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(null);
      const ref = fileRefs.current.get(color);
      if (ref) ref.value = "";
    }
  }

  function handleDelete(img: VariantImage) {
    deleteMut.mutate(img.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
        toast.success("Image removed");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleSetPrimary(img: VariantImage) {
    setPrimaryMut.mutate(
      { imageId: img.id, productId: item.id, color: img.color },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
          toast.success(`Set as primary for ${img.color}`);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }

  async function handleTypeChange(img: VariantImage, newType: string) {
    const { error } = await supabase
      .from("team_store_product_variant_images")
      .update({ image_type: newType } as any)
      .eq("id", img.id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading variant images…
      </div>
    );
  }

  if (enabledColors.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Enable color variants in the <strong>Variants</strong> tab first, then assign images per color here.
        </p>
      </div>
    );
  }

  // Build the list: enabled colors + any extra colors that have images but aren't in enabled list
  const allColors = [...enabledColors];
  for (const [color] of imagesByColor) {
    if (!allColors.some((c) => c.name === color)) {
      allColors.push({ code: color, name: color });
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label className="text-sm font-semibold">Per-Color Variant Images</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload images for each color variant. The storefront will show the correct images when a customer selects a color.
        </p>
      </div>

      {/* Warning for missing images */}
      {colorsWithoutImages.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <strong>{colorsWithoutImages.length} color{colorsWithoutImages.length > 1 ? "s" : ""} missing images:</strong>{" "}
            {colorsWithoutImages.map((c) => c.name).join(", ")}.
            The storefront will fall back to the default product image for these.
          </div>
        </div>
      )}

      {/* Per-color sections */}
      <div className="space-y-3">
        {allColors.map((color) => {
          const images = imagesByColor.get(color.name) || [];
          const isEnabled = enabledColors.some((c) => c.name === color.name);

          return (
            <div key={color.name} className="border rounded-lg overflow-hidden">
              {/* Color header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <span className="text-sm font-medium flex-1">{color.name}</span>
                {!isEnabled && (
                  <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">
                    Disabled variant
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[9px]">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Images grid */}
              <div className="p-3 space-y-2">
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative group border rounded bg-muted/20 overflow-hidden">
                        <div className="aspect-square flex items-center justify-center p-1">
                          <img
                            src={img.image_url}
                            alt={`${color.name} variant`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {/* View badge */}
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-[8px] px-1 h-4 capitalize">
                            {(img as any).view || "front"}
                          </Badge>
                        </div>
                        {/* Primary star */}
                        {img.is_primary && (
                          <div className="absolute top-1 left-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          </div>
                        )}
                        {/* Actions overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {!img.is_primary && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-[10px] px-2"
                              onClick={() => handleSetPrimary(img)}
                              disabled={setPrimaryMut.isPending}
                            >
                              <Star className="w-3 h-3 mr-0.5" /> Primary
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-[10px] px-2"
                            onClick={() => handleDelete(img)}
                            disabled={deleteMut.isPending}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {/* Type + View selectors */}
                        <div className="px-1 pb-1 space-y-1">
                          <Select
                            value={(img as any).view || "front"}
                            onValueChange={async (v) => {
                              const { error } = await supabase
                                .from("team_store_product_variant_images")
                                .update({ view: v } as any)
                                .eq("id", img.id);
                              if (error) toast.error(error.message);
                              else queryClient.invalidateQueries({ queryKey: ["variant-images", item.id] });
                            }}
                          >
                            <SelectTrigger className="h-6 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VIEW_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={img.image_type}
                            onValueChange={(v) => handleTypeChange(img, v)}
                          >
                            <SelectTrigger className="h-6 text-[10px]">
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
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <button
                  onClick={() => fileRefs.current.get(color.name)?.click()}
                  className="w-full h-10 border-2 border-dashed rounded flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  disabled={uploading === color.name}
                >
                  {uploading === color.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Add Image for {color.name}
                </button>
                <input
                  ref={(el) => {
                    if (el) fileRefs.current.set(color.name, el);
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(color.name, e)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
