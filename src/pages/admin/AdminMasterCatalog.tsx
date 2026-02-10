import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";
import { useState } from "react";

interface BrandWithCount {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  product_count: number;
}

export default function AdminMasterCatalog() {
  const [search, setSearch] = useState("");

  const { data: brands, isLoading } = useQuery({
    queryKey: ["master-catalog-brands"],
    queryFn: async () => {
      // Get all brands
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, logo_url, description")
        .order("name");
      if (brandsError) throw brandsError;

      // Get product counts per brand
      const { data: products, error: prodError } = await supabase
        .from("master_products")
        .select("brand_id")
        .eq("active", true);
      if (prodError) throw prodError;

      const counts: Record<string, number> = {};
      for (const p of products || []) {
        if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] || 0) + 1;
      }

      // Also count products with no brand
      const noBrandCount = (products || []).filter((p) => !p.brand_id).length;

      const result: BrandWithCount[] = (brandsData || [])
        .map((b) => ({
          ...b,
          product_count: counts[b.id] || 0,
        }))
        .filter((b) => b.product_count > 0);

      if (noBrandCount > 0) {
        result.push({
          id: "unbranded",
          name: "Other / Unbranded",
          logo_url: null,
          description: "Products without a specific brand",
          product_count: noBrandCount,
        });
      }

      return result;
    },
  });

  const filtered = (brands || []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  // Count totals by source
  const { data: sourceCounts } = useQuery({
    queryKey: ["master-catalog-source-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_products")
        .select("source")
        .eq("active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const p of data || []) {
        counts[p.source] = (counts[p.source] || 0) + 1;
      }
      return counts;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">Master Product Catalog</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Unified catalog of all products from Champro, S&S Activewear, ImprintID, and internal sources.
            Used to build and manage team stores.
          </p>
          {sourceCounts && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {Object.entries(sourceCounts).map(([source, count]) => (
                <Badge key={source} variant="secondary" className="text-xs">
                  {source.replace("_", " ")}: {count} products
                </Badge>
              ))}
              <Badge variant="default" className="text-xs">
                Total: {Object.values(sourceCounts).reduce((a, b) => a + b, 0)}
              </Badge>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Brand Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No brands found</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((brand) => (
              <Link
                key={brand.id}
                to={`/admin/catalog/master/brands/${brand.id}`}
              >
                <Card className="hover:border-accent transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-16 w-auto object-contain mb-4"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-sm">{brand.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {brand.product_count} {brand.product_count === 1 ? "product" : "products"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
