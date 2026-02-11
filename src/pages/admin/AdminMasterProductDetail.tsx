import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package } from "lucide-react";

export default function AdminMasterProductDetail() {
  const { productId } = useParams<{ productId: string }>();

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
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain p-8"
                />
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
                  <p className="text-sm font-medium text-accent uppercase tracking-wider">
                    {brand.name}
                  </p>
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
                  SKU: <span className="font-mono">{product.source_sku}</span>
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

              <Separator />

              {/* Field Table */}
              <div className="space-y-2 text-sm">
                <Row label="Product ID" value={product.id} mono />
                <Row label="Brand ID" value={product.brand_id || "—"} mono />
                <Row label="Source" value={product.source} />
                <Row label="Source SKU" value={product.source_sku || "—"} mono />
                <Row label="Default Vendor" value={product.default_vendor || "—"} />
                <Row label="Default Vendor SKU" value={product.default_vendor_sku || "—"} mono />
                <Row label="Base Price" value={product.base_price != null ? `$${product.base_price}` : "—"} />
                <Row label="MSRP" value={product.msrp != null ? `$${product.msrp}` : "—"} />
                <Row label="Created" value={new Date(product.created_at).toLocaleDateString()} />
                <Row label="Updated" value={new Date(product.updated_at).toLocaleDateString()} />
              </div>

              {/* Colors / Sizes */}
              {product.available_colors && Array.isArray(product.available_colors) && product.available_colors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available Colors ({(product.available_colors as any[]).length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {(product.available_colors as any[]).slice(0, 30).map((c: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {typeof c === "string" ? c : c.name || c.colorName || JSON.stringify(c)}
                        </Badge>
                      ))}
                      {(product.available_colors as any[]).length > 30 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{(product.available_colors as any[]).length - 30} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}

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
