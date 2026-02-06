import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader2, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";

interface BrandCard {
  name: string;
  image?: string;
  styleCount: number;
}

export default function SSProducts() {
  const [styles, setStyles] = useState<SSStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStyles();
        setStyles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load SS products:", err);
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const brands = useMemo<BrandCard[]>(() => {
    const map = new Map<string, BrandCard>();
    styles.forEach((s) => {
      if (!s.brandName) return;
      const existing = map.get(s.brandName);
      if (existing) {
        existing.styleCount++;
        if (!existing.image && s.brandImage) existing.image = s.brandImage;
      } else {
        map.set(s.brandName, {
          name: s.brandName,
          image: s.brandImage,
          styleCount: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.styleCount - a.styleCount);
  }, [styles]);

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
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading brands…</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error}</p>
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
                  {brands.length} brands · {styles.length.toLocaleString()} total styles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {brands.map((brand) => (
                    <Link
                      key={brand.name}
                      to={`/ss-products/brand/${encodeURIComponent(brand.name)}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center p-6"
                    >
                      <div className="w-full h-24 flex items-center justify-center mb-4">
                        {brand.image ? (
                          <img
                            src={brand.image}
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
