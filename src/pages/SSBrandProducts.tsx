import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader2, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";

interface CategoryCard {
  name: string;
  styleCount: number;
  sampleImage?: string;
}

export default function SSBrandProducts() {
  const { brandName } = useParams<{ brandName: string }>();
  const decodedBrand = brandName ? decodeURIComponent(brandName) : "";

  const [styles, setStyles] = useState<SSStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedBrand) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStyles();
        const allStyles = Array.isArray(data) ? data : [];
        setStyles(allStyles.filter((s) => s.brandName === decodedBrand));
      } catch (err) {
        console.error("Failed to load brand products:", err);
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [decodedBrand]);

  const brandImage = styles[0]?.brandImage;

  const categories = useMemo<CategoryCard[]>(() => {
    const map = new Map<string, CategoryCard>();
    styles.forEach((s) => {
      const cat = s.baseCategory || "Other";
      const existing = map.get(cat);
      if (existing) {
        existing.styleCount++;
        if (!existing.sampleImage && s.styleImage) existing.sampleImage = s.styleImage;
      } else {
        map.set(cat, {
          name: cat,
          styleCount: 1,
          sampleImage: s.styleImage,
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
              <Link to="/ss-products" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              {brandImage ? (
                <img src={brandImage} alt={decodedBrand} className="h-10 object-contain brightness-0 invert" />
              ) : (
                <Package className="w-8 h-8 text-accent" />
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                {decodedBrand}
              </h1>
            </div>
            <p className="text-lg text-primary-foreground/70 max-w-2xl ml-8">
              Select a category to browse {decodedBrand} products.
            </p>
          </div>
        </section>

        {/* Category Grid */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading categories…</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  {categories.length} categories · {styles.length.toLocaleString()} total styles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      to={`/ss-products/brand/${encodeURIComponent(decodedBrand)}/${encodeURIComponent(cat.name)}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                    >
                      <div className="h-32 bg-secondary flex items-center justify-center overflow-hidden">
                        {cat.sampleImage ? (
                          <img
                            src={cat.sampleImage}
                            alt={cat.name}
                            className="max-h-full max-w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="p-4 text-center">
                        <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors text-sm">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cat.styleCount} {cat.styleCount === 1 ? "style" : "styles"}
                        </p>
                      </div>
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
