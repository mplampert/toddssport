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
import { ArrowLeft, Package, Pencil, Check, X } from "lucide-react";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";
import { toast } from "sonner";

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
  const ssStyleId = product?.source === "ss_activewear" ? product.source_sku : null;
  const { data: ssProducts = [], isLoading: loadingSS } = useQuery({
    queryKey: ["admin-ss-products", ssStyleId],
    queryFn: async () => {
      try {
        const data = await getProducts({ style: ssStyleId! });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!ssStyleId,
  });

  // Deduplicate colors from S&S variants
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

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const activeColorImage = selectedColor
    ? colorOptions.find((c) => c.name === selectedColor)?.frontImage
    : null;

  const brand = (product as any)?.brands;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back link */}
        <div className="flex items-center gap-3">
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
            <div className="bg-card rounded-xl border border-border overflow-hidden aspect-square flex items-center justify-center">
              {activeColorImage ? (
                <img src={activeColorImage} alt={selectedColor || product.name} className="w-full h-full object-contain p-8" />
              ) : product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-8" />
              ) : (
                <Package className="w-24 h-24 text-muted-foreground/20" />
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

              {/* Editable Pricing */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Internal Pricing</h4>
                <EditablePrice
                  label="Base Price"
                  value={product.base_price}
                  productId={product.id}
                  field="base_price"
                  queryClient={queryClient}
                />
                <EditablePrice
                  label="MSRP"
                  value={product.msrp}
                  productId={product.id}
                  field="msrp"
                  queryClient={queryClient}
                />
              </div>

              {/* S&S Color Swatches */}
              {colorOptions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        Colors ({colorOptions.length})
                      </h4>
                      {selectedColor && (
                        <span className="text-xs text-muted-foreground">{selectedColor}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(selectedColor === c.name ? null : c.name)}
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
              {ssStyleId && loadingSS && (
                <>
                  <Separator />
                  <Skeleton className="h-12 w-full" />
                </>
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
}: {
  label: string;
  value: number | null;
  productId: string;
  field: "base_price" | "msrp";
  queryClient: ReturnType<typeof useQueryClient>;
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
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }}
      >
        <Pencil className="w-3 h-3" />
      </Button>
    </div>
  );
}
