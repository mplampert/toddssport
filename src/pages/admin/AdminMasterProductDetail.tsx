import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Pencil, Check, X, Wand2, RefreshCw, Lock, Unlock, ImageIcon, Download } from "lucide-react";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { toast } from "sonner";
import { FastMockupDrawer } from "@/components/admin/catalog/FastMockupDrawer";
import { Switch } from "@/components/ui/switch";

export default function AdminMasterProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-master-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_products")
        .select("*, brands!master_products_brand_id_fkey(id, name, logo_url)")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch S&S color/variant data for S&S products
  // source_sku holds the styleName (e.g. "18500"), but the S&S API needs the numeric styleID.
  // Look it up from catalog_styles first, then fall back to supplier_item_number (partNumber).
  const isSSProduct = product?.source === "ss_activewear";
  const ssSourceSku = isSSProduct ? product.source_sku : null;
  const ssSupplierItem = isSSProduct ? (product as any).supplier_item_number : null;

  const { data: resolvedStyleId } = useQuery({
    queryKey: ["ss-resolve-style-id", ssSourceSku, ssSupplierItem],
    queryFn: async () => {
      // Try matching by part_number (supplier item) first, then by style_name
      const { data } = await supabase
        .from("catalog_styles")
        .select("style_id")
        .or(`part_number.eq.${ssSupplierItem},style_name.eq.${ssSourceSku}`)
        .limit(1)
        .maybeSingle();
      return data?.style_id ?? null;
    },
    enabled: !!(ssSourceSku || ssSupplierItem),
    staleTime: Infinity,
  });

  const { data: ssProducts = [], isLoading: loadingSS } = useQuery({
    queryKey: ["admin-ss-products", resolvedStyleId],
    queryFn: async () => {
      try {
        const data = await getProducts({ style: resolvedStyleId! });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!resolvedStyleId,
  });

  // Deduplicate colors from S&S variants (live API fallback)
  const colorOptions = (() => {
    const map = new Map<string, { name: string; swatchImage?: string; frontImage?: string; color1?: string; color2?: string }>();
    ssProducts.forEach((p) => {
      if (p.colorName && !map.has(p.colorName)) {
        map.set(p.colorName, {
          name: p.colorName,
          swatchImage: p.colorSwatchImage,
          frontImage: p.colorFrontImage,
          color1: p.color1,
          color2: p.color2,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Fetch stored color images from DB (synced from S&S)
  const { data: dbColorImages = [] } = useQuery({
    queryKey: ["admin-color-images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_color_images")
        .select("*")
        .eq("master_product_id", productId!)
        .order("color_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  // Use DB color images if available, fall back to live API
  const hasDbImages = dbColorImages.length > 0;
  const effectiveColors = hasDbImages
    ? dbColorImages.map((c: any) => ({
        name: c.color_name,
        swatchImage: c.swatch_image_url,
        frontImage: c.front_image_url,
        backImage: c.back_image_url,
        sideImage: c.side_image_url,
        directSideImage: c.direct_side_image_url,
        color1: c.color1,
        color2: c.color2,
        syncedAt: c.synced_at,
      }))
    : colorOptions.map((c) => ({
        name: c.name,
        swatchImage: c.swatchImage,
        frontImage: c.frontImage,
        backImage: undefined as string | undefined,
        sideImage: undefined as string | undefined,
        directSideImage: undefined as string | undefined,
        color1: c.color1,
        color2: c.color2,
        syncedAt: undefined as string | undefined,
      }));

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [mockupOpen, setMockupOpen] = useState(false);
  const selectedColorData = selectedColor
    ? effectiveColors.find((c) => c.name === selectedColor)
    : null;
  const activeColorImage = selectedColorData?.frontImage || null;

  // Gallery images for selected color
  const galleryImages = selectedColorData
    ? [
        selectedColorData.frontImage && { url: selectedColorData.frontImage, label: "Front" },
        selectedColorData.backImage && { url: selectedColorData.backImage, label: "Back" },
        selectedColorData.sideImage && { url: selectedColorData.sideImage, label: "Side" },
        selectedColorData.directSideImage && { url: selectedColorData.directSideImage, label: "Direct Side" },
      ].filter(Boolean) as { url: string; label: string }[]
    : [];

  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  // Reset gallery index on color change
  const activeMainImage = galleryImages.length > 0
    ? galleryImages[Math.min(activeGalleryIdx, galleryImages.length - 1)]?.url
    : activeColorImage;

  const brand = (product as any)?.brands;
  const currentImage = activeMainImage || product?.image_url || null;

  // Size pricing for S&S products
  const { data: sizePricing = [] } = useQuery({
    queryKey: ["admin-size-pricing", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_size_pricing")
        .select("*")
        .eq("master_product_id", productId!)
        .order("size_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  // Toggle pricing override
  const overrideMutation = useMutation({
    mutationFn: async (override: boolean) => {
      const { error } = await supabase
        .from("master_products")
        .update({ pricing_override: override })
        .eq("id", productId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-product", productId] });
      toast.success("Pricing override updated");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={brand?.id ? `/admin/catalog/master/brands/${brand.id}` : "/admin/catalog/master"}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground truncate">
              {isLoading ? <Skeleton className="h-7 w-64" /> : product?.name || "Product Detail"}
            </h1>
          </div>
          {product && (
            <Button variant="outline" size="sm" onClick={() => setMockupOpen(true)} className="shrink-0 gap-2">
              <Wand2 className="w-4 h-4" />
              Create fast mockup
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : !product ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Product not found</h3>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="space-y-2">
              <div className="bg-card rounded-xl border border-border overflow-hidden aspect-square flex items-center justify-center">
                {currentImage ? (
                  <img src={currentImage} alt={selectedColor || product.name} className="w-full h-full object-contain p-8" />
                ) : (
                  <Package className="w-24 h-24 text-muted-foreground/20" />
                )}
              </div>
              {/* Gallery thumbnails when a color is selected */}
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={img.label}
                      onClick={() => setActiveGalleryIdx(idx)}
                      className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                        idx === Math.min(activeGalleryIdx, galleryImages.length - 1)
                          ? "border-accent ring-2 ring-accent/20"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
              {selectedColor && galleryImages.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  {galleryImages[Math.min(activeGalleryIdx, galleryImages.length - 1)]?.label} view
                  {hasDbImages && " · Synced from S&S"}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              {brand?.name && (
                <div className="flex items-center gap-3">
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt={brand.name} className="h-8 object-contain" />
                  )}
                  <p className="text-sm font-medium text-accent uppercase tracking-wider">{brand.name}</p>
                </div>
              )}

              <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>

              <div className="flex flex-wrap gap-2">
                <Badge variant={product.active ? "default" : "destructive"}>
                  {product.active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {product.source.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {product.product_type.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {product.category.replace(/_/g, " ")}
                </Badge>
              </div>

              {product.source_sku && (
                <p className="text-sm text-muted-foreground">
                  Source SKU: <span className="font-mono">{product.source_sku}</span>
                </p>
              )}
              {(product as any).supplier_item_number && (
                <p className="text-sm text-muted-foreground">
                  Supplier Item #: <span className="font-mono">{(product as any).supplier_item_number}</span>
                </p>
              )}

              {product.description_short && (
                <>
                  <Separator />
                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.description_short }}
                  />
                </>
              )}

              {/* Internal Pricing */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Internal Pricing</h4>
                  {isSSProduct && (
                    <div className="flex items-center gap-2">
                      {(product as any).pricing_synced_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Synced {new Date((product as any).pricing_synced_at).toLocaleDateString()}
                        </span>
                      )}
                      {(product as any).pricing_override ? (
                        <Lock className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {isSSProduct && (
                  <div className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={(product as any).pricing_override ?? false}
                      onCheckedChange={(v) => overrideMutation.mutate(v)}
                      className="scale-75"
                    />
                    <span className="text-muted-foreground">
                      {(product as any).pricing_override ? "Manual override ON — won't be overwritten by sync" : "Auto-synced from S&S"}
                    </span>
                  </div>
                )}

                <EditablePrice
                  label="Base Price"
                  value={product.base_price}
                  productId={product.id}
                  field="base_price"
                  queryClient={queryClient}
                  readOnly={isSSProduct && !(product as any).pricing_override}
                />
                <EditablePrice
                  label="MSRP"
                  value={product.msrp}
                  productId={product.id}
                  field="msrp"
                  queryClient={queryClient}
                  readOnly={isSSProduct && !(product as any).pricing_override}
                />

                {/* Per-size pricing table */}
                {sizePricing.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Size Pricing</h5>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-1.5 font-medium">Size</th>
                            <th className="text-right px-3 py-1.5 font-medium">Piece</th>
                            <th className="text-right px-3 py-1.5 font-medium">Dozen</th>
                            <th className="text-right px-3 py-1.5 font-medium">Case</th>
                            <th className="text-right px-3 py-1.5 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizePricing.map((sp: any) => (
                            <tr key={sp.id} className="border-t border-border">
                              <td className="px-3 py-1.5 font-mono">{sp.size_name}</td>
                              <td className="text-right px-3 py-1.5">{sp.piece_price ? `$${Number(sp.piece_price).toFixed(2)}` : "—"}</td>
                              <td className="text-right px-3 py-1.5">{sp.dozen_price ? `$${Number(sp.dozen_price).toFixed(2)}` : "—"}</td>
                              <td className="text-right px-3 py-1.5">{sp.case_price ? `$${Number(sp.case_price).toFixed(2)}` : "—"}</td>
                              <td className="text-right px-3 py-1.5">
                                {sp.is_upcharge ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5">Upcharge</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Core</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* S&S Color Swatches */}
              {effectiveColors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        Colors ({effectiveColors.length})
                        {hasDbImages && (
                          <Badge variant="outline" className="ml-2 text-[9px]">
                            <RefreshCw className="w-2.5 h-2.5 mr-1" />
                            Synced from S&S
                          </Badge>
                        )}
                      </h4>
                      {selectedColor && (
                        <span className="text-xs text-muted-foreground">{selectedColor}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {effectiveColors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            setSelectedColor(selectedColor === c.name ? null : c.name);
                            setActiveGalleryIdx(0);
                          }}
                          title={c.name}
                          className={`relative w-9 h-9 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedColor === c.name
                              ? "border-accent ring-2 ring-accent/20 scale-110"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                        >
                          {c.swatchImage ? (
                            <img src={c.swatchImage} alt={c.name} className="w-full h-full object-cover" />
                          ) : c.color1 ? (
                            <div
                              className="w-full h-full"
                              style={{
                                background: c.color2
                                  ? `linear-gradient(135deg, ${c.color1} 50%, ${c.color2} 50%)`
                                  : c.color1,
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-[8px] text-muted-foreground">{c.name.slice(0, 3)}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {isSSProduct && !hasDbImages && loadingSS && (
                <>
                  <Separator />
                  <Skeleton className="h-12 w-full" />
                </>
              )}
              {/* Sync images button for S&S products without synced images */}
              {isSSProduct && !hasDbImages && !loadingSS && effectiveColors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={async () => {
                      try {
                        toast.info("Syncing color images from S&S…");
                        const { error } = await supabase.functions.invoke("ss-backfill-images", {
                          body: { force: true, limit: 1 },
                        });
                        if (error) throw error;
                        queryClient.invalidateQueries({ queryKey: ["admin-color-images", productId] });
                        queryClient.invalidateQueries({ queryKey: ["admin-master-product", productId] });
                        toast.success("Color images synced");
                      } catch {
                        toast.error("Failed to sync images");
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Sync color images from S&S
                  </Button>
                </div>
              )}

              <Separator />

              {/* Field Table */}
              <div className="space-y-2 text-sm">
                <Row label="Product ID" value={product.id} mono />
                <Row label="Brand ID" value={product.brand_id || "—"} mono />
                <Row label="Source" value={product.source} />
                <Row label="Source SKU" value={product.source_sku || "—"} mono />
                <Row label="Supplier Item #" value={(product as any).supplier_item_number || "—"} mono />
                <Row label="Default Vendor" value={product.default_vendor || "—"} />
                <Row label="Default Vendor SKU" value={product.default_vendor_sku || "—"} mono />
                <Row label="Created" value={new Date(product.created_at).toLocaleDateString()} />
                <Row label="Updated" value={new Date(product.updated_at).toLocaleDateString()} />
              </div>

              {/* Sizes from DB */}
              {product.available_sizes && Array.isArray(product.available_sizes) && product.available_sizes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available Sizes ({(product.available_sizes as any[]).length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {(product.available_sizes as any[]).map((s: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {typeof s === "string" ? s : JSON.stringify(s)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Public catalog link */}
              <Separator />
              <Link
                to={`/catalog/${product.id}`}
                className="text-sm text-accent hover:underline"
                target="_blank"
              >
                View public catalog page →
              </Link>
            </div>
          </div>
        )}
      </div>

      <FastMockupDrawer
        open={mockupOpen}
        onOpenChange={setMockupOpen}
        productImage={currentImage}
        productName={product?.name || "Product"}
      />
    </AdminLayout>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground text-right truncate max-w-[60%] ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function EditablePrice({
  label,
  value,
  productId,
  field,
  queryClient,
  readOnly = false,
}: {
  label: string;
  value: number | null;
  productId: string;
  field: "base_price" | "msrp";
  queryClient: ReturnType<typeof useQueryClient>;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");

  const mutation = useMutation({
    mutationFn: async (newVal: number | null) => {
      const { error } = await supabase
        .from("master_products")
        .update({ [field]: newVal })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-master-product", productId] });
      toast.success(`${label} updated`);
      setEditing(false);
    },
    onError: () => toast.error(`Failed to update ${label}`),
  });

  const handleSave = () => {
    const parsed = draft.trim() === "" ? null : parseFloat(draft);
    if (parsed !== null && isNaN(parsed)) {
      toast.error("Enter a valid number");
      return;
    }
    mutation.mutate(parsed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">{label}</span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 w-28 text-sm"
          placeholder="0.00"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={mutation.isPending}>
          <Check className="w-4 h-4 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value != null ? `$${Number(value).toFixed(2)}` : "—"}
      </span>
      {!readOnly && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      )}
      {readOnly && (
        <span className="text-[10px] text-muted-foreground/60 italic">synced</span>
      )}
    </div>
  );
}
