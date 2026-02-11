import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader2, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BrandCard {
  id: string;
  name: string;
  logo_url: string | null;
  styleCount: number;
}

export default function SSProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ss-products-brands"],
    queryFn: async () => {
      // Get brands with show_in_catalog and product counts
      const [brandsRes, productsRes] = await Promise.all([
        supabase.from("brands").select("id, name, logo_url, show_in_catalog").order("name"),
        supabase
          .from("master_products")
          .select("brand_id")
          .eq("active", true)
          .eq("source", "ss_activewear"),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      if (productsRes.error) throw productsRes.error;

      // Count products per brand
      const counts = new Map<string, number>();
      for (const p of productsRes.data || []) {
        if (p.brand_id) counts.set(p.brand_id, (counts.get(p.brand_id) || 0) + 1);
      }

      const visibleBrands = (brandsRes.data || []).filter(
        (b: any) => b.show_in_catalog !== false && counts.has(b.id)
      );

      const brands: BrandCard[] = visibleBrands
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          logo_url: b.logo_url,
          styleCount: counts.get(b.id) || 0,
        }))
        .sort((a: BrandCard, b: BrandCard) => b.styleCount - a.styleCount);

      const total = brands.reduce((s, b) => s + b.styleCount, 0);
      return { brands, total };
    },
    staleTime: 5 * 60 * 1000,
  });

  const brands = data?.brands || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-navy py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-3">
              <Link to="/catalogs" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Package className="w-8 h-8 text-accent" />
              <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                Blank Apparel Catalog
              </h1>
            </div>
            <p className="text-lg text-primary-foreground/70 max-w-2xl ml-8">
              Browse thousands of blank apparel styles from top brands. Select a brand to explore their full catalog.
            </p>
          </div>
        </section>

        {/* Brand Grid */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading brands…</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error instanceof Error ? error.message : "Failed to load"}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No brands found</h3>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  {brands.length} brands · {total.toLocaleString()} total styles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {brands.map((brand) => (
                    <Link
                      key={brand.id}
                      to={`/ss-products/brand/${encodeURIComponent(brand.name)}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center p-6"
                    >
                      <div className="w-full h-24 flex items-center justify-center mb-4">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground/40">
                            {brand.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground text-center group-hover:text-accent transition-colors text-sm">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {brand.styleCount} {brand.styleCount === 1 ? "style" : "styles"}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}