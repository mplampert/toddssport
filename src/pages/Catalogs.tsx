import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CatalogCard } from "@/components/shared/CatalogCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, BookOpen, Package } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

interface Catalog {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  catalog_url: string;
  category: string | null;
  sort_order: number | null;
}

const Catalogs = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      const { data, error } = await supabase
        .from("catalogs")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (data) {
        setCatalogs(data);
      }
      if (error) {
        console.error("Error fetching catalogs:", error);
      }
      setLoading(false);
    };

    fetchCatalogs();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-navy py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen className="w-10 h-10 text-accent" />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground text-center">
                Catalogs
              </h1>
            </div>
            <p className="text-xl text-primary-foreground/80 text-center max-w-3xl mx-auto">
              Browse our complete collection of brand catalogs and product guides. 
              Find the perfect apparel, gear, and promotional products for your team, 
              organization, or business.
            </p>
          </div>
        </section>

        {/* Catalogs Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : catalogs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {catalogs.map((catalog) => (
                  <CatalogCard
                    key={catalog.id}
                    title={catalog.title}
                    description={catalog.description || undefined}
                    thumbnailUrl={catalog.thumbnail_url || undefined}
                    catalogUrl={catalog.catalog_url}
                    category={catalog.category || undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Catalogs Available
                </h3>
                <p className="text-muted-foreground">
                  Check back soon for our product catalogs!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* S&S Activewear Catalog CTA */}
        {FEATURE_FLAGS.ENABLE_SS_CATALOG && (
        <section className="py-12 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <Package className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Blank Apparel Catalog
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Browse thousands of blank apparel styles with real-time pricing and inventory from S&amp;S Activewear.
            </p>
            <Button asChild className="btn-cta px-8 py-6 text-lg">
              <Link to="/ss-products">Browse Blank Apparel</Link>
            </Button>
          </div>
        </section>
        )}

        {/* Find Your Rep Section */}
        <section className="bg-secondary py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Find Your Rep
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Have questions about our catalogs or need help finding the right products? 
              Our team of experts is ready to assist you with personalized recommendations 
              and competitive pricing.
            </p>
            <Button asChild className="btn-cta px-8 py-6 text-lg">
              <Link to="/contact">Get a Quote</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Catalogs;
