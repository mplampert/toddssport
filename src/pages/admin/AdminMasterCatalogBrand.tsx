import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, Search } from "lucide-react";
import { useState } from "react";

export default function AdminMasterCatalogBrand() {
  const { brandId } = useParams<{ brandId: string }>();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const isUnbranded = brandId === "unbranded";

  const { data: brand } = useQuery({
    queryKey: ["master-catalog-brand", brandId],
    queryFn: async () => {
      if (isUnbranded) return { id: "unbranded", name: "Other / Unbranded", logo_url: null };
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url, description")
        .eq("id", brandId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["master-catalog-products", brandId],
    queryFn: async () => {
      let query = supabase
        .from("master_products")
        .select("*")
        .eq("active", true)
        .order("name");

      if (isUnbranded) {
        query = query.is("brand_id", null);
      } else {
        query = query.eq("brand_id", brandId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Extract unique filter values
  const categories = [...new Set((products || []).map((p) => p.category))].sort();
  const sources = [...new Set((products || []).map((p) => p.source))].sort();
  const types = [...new Set((products || []).map((p) => p.product_type))].sort();

  const filtered = (products || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.source_sku || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
    if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <Link
            to="/admin/catalog/master"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Master Catalog
          </Link>
          <div className="flex items-center gap-4">
            {brand?.logo_url && (
              <img src={brand.logo_url} alt={brand.name} className="h-12 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{brand?.name || "Brand"}</h1>
              <p className="text-sm text-muted-foreground">
                {filtered.length} of {(products || []).length} products shown
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(categoryFilter !== "all" || sourceFilter !== "all" || typeFilter !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCategoryFilter("all"); setSourceFilter("all"); setTypeFilter("all"); setSearch(""); }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No products match your filters</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {product.source.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {product.product_type.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {product.category}
                    </Badge>
                  </div>
                  {product.source_sku && (
                    <p className="text-xs text-muted-foreground">SKU: {product.source_sku}</p>
                  )}
                  {product.description_short && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {product.description_short}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
