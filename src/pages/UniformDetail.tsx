import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useUniformCardBySlug, fetchAllUniformCards, UniformCard } from "@/hooks/useUniformCards";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ChamproBuilderEmbed, hasChamproBuilder } from "@/components/uniforms/ChamproBuilderEmbed";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type LeadTimeType,
  type GlobalPricing,
  type ChamproCategory,
  calculatePerUnit,
} from "@/lib/champroPricing";
import { getCartSessionId } from "@/lib/cartSession";
import { UniformDetailHero } from "@/components/uniforms/UniformDetailHero";
import { UniformBenefits } from "@/components/uniforms/UniformBenefits";
import { UniformHowItWorks } from "@/components/uniforms/UniformHowItWorks";
import { UniformFAQ } from "@/components/uniforms/UniformFAQ";

interface ProductPricing {
  moq: number;
  baseCost: number;
  globalPricing: GlobalPricing;
  productMaster: string;
  category: ChamproCategory;
}

export default function UniformDetail() {
  const navigate = useNavigate();
  const { sport: sportSlug } = useParams<{ sport: string }>();
  const { card: sport, loading: loadingSport, error: sportError } = useUniformCardBySlug(sportSlug);
  const [allCards, setAllCards] = useState<UniformCard[]>([]);
  const [embedKey, setEmbedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Order defaults
  const [quantity, setQuantity] = useState<number>(12);
  const [leadTime, setLeadTime] = useState<LeadTimeType>("standard");
  const [category, setCategory] = useState<ChamproCategory>("JERSEYS");
  const [teamName] = useState("");

  // Pricing state
  const [productPricing, setProductPricing] = useState<ProductPricing | null>(null);

  // Fetch all cards for "other sports" section
  useEffect(() => {
    fetchAllUniformCards().then(setAllCards);
  }, []);

  // Fetch the Champro embed key from edge function
  useEffect(() => {
    async function fetchEmbedKey() {
      try {
        const { data, error } = await supabase.functions.invoke("champro-embed-key");
        if (error) {
          console.error("Error fetching embed key:", error);
        } else if (data?.embedKey) {
          setEmbedKey(data.embedKey);
        }
      } catch (err) {
        console.error("Failed to fetch embed key:", err);
      } finally {
        setLoadingKey(false);
      }
    }
    fetchEmbedKey();
  }, []);

  // Fetch product pricing for this sport (to get MOQ and unit price for cart)
  useEffect(() => {
    async function fetchPricing() {
      if (!sportSlug) return;

      try {
        // Only fetch sellable products (type="product"), not categories
        const { data: products, error: productError } = await supabase
          .from("champro_products")
          .select("*")
          .eq("sport", sportSlug)
          .eq("type", "product")
          .limit(1);

        if (productError || !products || products.length === 0) {
          console.log("No pricing configured for sport:", sportSlug);
          return;
        }

        const product = products[0];

        const { data: wholesale } = await supabase
          .from("champro_wholesale")
          .select("*")
          .eq("champro_product_id", product.id)
          .single();

        const { data: globalSettings } = await supabase
          .from("champro_pricing_settings")
          .select("*")
          .eq("scope", "global")
          .single();

        if (wholesale && globalSettings) {
          const productCategory = (product.category || "JERSEYS") as ChamproCategory;
          setProductPricing({
            moq: product.moq_custom,
            baseCost: Number(wholesale.base_cost),
            globalPricing: {
              markupPercent: Number(globalSettings.markup_percent),
              rushPercent: Number(globalSettings.rush_percent),
            },
            productMaster: product.product_master,
            category: productCategory,
          });
          setQuantity(product.moq_custom);
          setCategory(productCategory);
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }
    }
    fetchPricing();
  }, [sportSlug]);

  // Called when design is saved in the Champro builder - add to cart and redirect
  const handleDesignSaved = useCallback(
    async ({
      champroSessionId: sessionId,
      sportSlug: savedSportSlug,
    }: {
      champroSessionId: string;
      sportSlug: string;
    }) => {
      console.log("Champro design saved:", sessionId);

      // Calculate current price for cart
      const currentPerUnitPrice = productPricing
        ? calculatePerUnit(
            { baseCost: productPricing.baseCost },
            productPricing.globalPricing,
            leadTime
          )
        : null;

      // Add to cart via edge function
      setIsCheckingOut(true);
      try {
        const cartSessionId = getCartSessionId();

        const { data, error } = await supabase.functions.invoke("champro-cart-item", {
          body: {
            champroSessionId: sessionId,
            sportSlug: savedSportSlug,
            sportTitle: sport?.title,
            quantity,
            leadTime,
            teamName,
            category,
            productMaster: productPricing?.productMaster,
            unitPrice: currentPerUnitPrice,
            cartSessionId,
          },
        });

        if (error) {
          console.error("Cart error:", error);
          toast.error("Failed to add to cart. Please try again.");
          return;
        }

        if (data?.success) {
          toast.success("Design added to cart!", {
            duration: 3000,
          });
          navigate("/cart");
        } else {
          toast.error(data?.error || "Failed to add to cart.");
        }
      } catch (err) {
        console.error("Cart add failed:", err);
        toast.error("Unable to add to cart. Please try again.");
      } finally {
        setIsCheckingOut(false);
      }
    },
    [sport?.title, quantity, leadTime, teamName, category, productPricing, navigate]
  );

  const scrollToQuote = () => {
    window.location.href = "/#quote-form";
  };

  // Show loading state
  if (loadingSport) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!sport || sportError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Sport Not Found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find uniforms for that sport.</p>
            <Button asChild>
              <Link to="/uniforms">Browse All Sports</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasBuilder = hasChamproBuilder(sport.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <UniformDetailHero
          title={sport.title}
          description={sport.description}
          icon={sport.icon || undefined}
          imageUrl={sport.image_url || undefined}
        />

        {/* Benefits Cards */}
        <UniformBenefits />

        {/* Custom Builder Section */}
        {hasBuilder && (
          <section id="uniform-builder" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Design Your {sport.title} Uniforms
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Use our interactive uniform builder to customize colors, add your team name, and see
                  your design come to life.
                </p>
              </div>

              {loadingKey ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : embedKey ? (
                <>
                  <ChamproBuilderEmbed
                    sportSlug={sport.slug}
                    sportTitle={sport.title}
                    embedKey={embedKey}
                    height="850px"
                    onCheckout={handleDesignSaved}
                  />
                </>
              ) : (
                <div className="bg-muted/50 rounded-lg p-8 text-center max-w-2xl mx-auto">
                  <p className="text-muted-foreground">
                    The uniform designer is temporarily unavailable. Please contact us for assistance.
                  </p>
                  <Button onClick={scrollToQuote} className="btn-cta mt-4">
                    Request a Quote Instead
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <UniformHowItWorks />

        {/* FAQ Section */}
        <UniformFAQ sportName={sport.title} />

        {/* CTA for sports without builder */}
        {!hasBuilder && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center p-8 bg-accent/10 rounded-xl border border-accent/20 max-w-3xl mx-auto">
                <h3 className="text-xl font-bold text-foreground mb-2">Request a Custom Quote</h3>
                <p className="text-muted-foreground mb-6">
                  Contact us for a personalized {sport.title.toLowerCase()} uniform consultation and
                  quote.
                </p>
                <Button onClick={scrollToQuote} className="btn-cta">
                  Request a {sport.title} Uniform Quote
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Other Sports */}
        <section className="py-16 bg-secondary/30 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Explore Other Sports
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {allCards
                .filter((s) => s.id !== sport.id)
                .slice(0, 8)
                .map((s) => (
                  <Link
                    key={s.id}
                    to={`/uniforms/${s.slug}`}
                    className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border hover:border-accent hover:shadow-md transition-all"
                  >
                    {s.icon && <span className="text-lg">{s.icon}</span>}
                    <span className="font-medium text-foreground hover:text-accent">{s.title}</span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
