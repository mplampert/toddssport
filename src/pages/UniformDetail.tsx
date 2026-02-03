import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useUniformCardBySlug, fetchAllUniformCards, UniformCard } from "@/hooks/useUniformCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Loader2, ShoppingCart } from "lucide-react";
import { ChamproBuilderEmbed, hasChamproBuilder } from "@/components/uniforms/ChamproBuilderEmbed";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type LeadTimeType,
  type GlobalPricing,
  type ChamproCategory,
  calculatePerUnit,
  formatPrice,
} from "@/lib/champroPricing";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductPricing {
  moq: number;
  baseCost: number;
  globalPricing: GlobalPricing;
  productMaster: string;
  category: ChamproCategory;
}

export default function UniformDetail() {
  const { sport: sportSlug } = useParams<{ sport: string }>();
  const { card: sport, loading: loadingSport, error: sportError } = useUniformCardBySlug(sportSlug);
  const [allCards, setAllCards] = useState<UniformCard[]>([]);
  const [embedKey, setEmbedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Checkout form state
  const [champroSessionId, setChamproSessionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(12);
  const [leadTime, setLeadTime] = useState<LeadTimeType>("standard");
  const [category, setCategory] = useState<ChamproCategory>("JERSEYS");
  const [teamName, setTeamName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  
  // Pricing state
  const [productPricing, setProductPricing] = useState<ProductPricing | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

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

  // Fetch product pricing for this sport
  useEffect(() => {
    async function fetchPricing() {
      if (!sportSlug) return;
      
      try {
        // Get product for this sport
        const { data: products, error: productError } = await supabase
          .from("champro_products")
          .select("*")
          .eq("sport", sportSlug)
          .limit(1);

        if (productError || !products || products.length === 0) {
          console.log("No pricing configured for sport:", sportSlug);
          setLoadingPricing(false);
          return;
        }

        const product = products[0];

        // Get wholesale pricing
        const { data: wholesale } = await supabase
          .from("champro_wholesale")
          .select("*")
          .eq("champro_product_id", product.id)
          .single();

        // Get global pricing settings
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
      } finally {
        setLoadingPricing(false);
      }
    }
    fetchPricing();
  }, [sportSlug]);

  // Called when design is saved in the Champro builder
  const handleDesignSaved = useCallback(({
    champroSessionId: sessionId,
  }: {
    champroSessionId: string;
    sportSlug: string;
  }) => {
    console.log("Champro design saved:", sessionId);
    setChamproSessionId(sessionId);
    toast.success("Design saved! Complete the form below to checkout.", {
      duration: 5000,
    });
  }, []);

  // Called when user clicks checkout button
  const handleCheckout = useCallback(async () => {
    if (!champroSessionId) {
      toast.error("Please save your design first using the builder above.");
      return;
    }

    if (!quantity || quantity < (productPricing?.moq || 1)) {
      toast.error(`Minimum order quantity is ${productPricing?.moq || 12} units.`);
      return;
    }

    setIsCheckingOut(true);

    try {
      const { data, error } = await supabase.functions.invoke("champro-checkout", {
        body: {
          champroSessionId,
          sportSlug,
          category,
          productMaster: productPricing?.productMaster,
          quantity,
          leadTime,
          teamName,
          customerEmail,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        const errorData = error.message ? JSON.parse(error.message) : {};
        toast.error(errorData.error || "Unable to start checkout. Please try again.");
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        // Fallback: show success message with session ID for manual processing
        toast.success(
          `Your ${sport?.title || sportSlug} uniform design has been saved!`,
          {
            description: `Session ID: ${champroSessionId}. Contact us with this ID to get pricing and complete your order.`,
            duration: 10000,
          }
        );
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error("Unable to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [champroSessionId, sportSlug, category, productPricing, quantity, leadTime, teamName, customerEmail, sport?.title]);

  // Calculate current price
  const perUnitPrice = productPricing
    ? calculatePerUnit(
        { baseCost: productPricing.baseCost },
        productPricing.globalPricing,
        leadTime
      )
    : 0;

  const totalPrice = perUnitPrice * quantity;

  // Placeholder content
  const uniformTypes = [
    "Game jerseys",
    "Practice gear",
    "Warm-ups & sideline apparel",
    "Team bags & accessories",
  ];

  const decorationOptions = [
    "Screen printing",
    "Embroidery",
    "Heat transfer",
    "Sublimation",
  ];

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
            <p className="text-muted-foreground mb-6">
              We couldn't find uniforms for that sport.
            </p>
            <Button asChild>
              <Link to="/uniforms">Browse All Sports</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${sport.image_url || '/placeholder.svg'})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/85 to-charcoal/60" />
          
          <div className="container mx-auto px-4 relative z-10">
            <Link 
              to="/uniforms" 
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-accent mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Sports
            </Link>
            
            <div className="flex items-center gap-4 mb-4">
              {sport.icon && <span className="text-5xl md:text-6xl">{sport.icon}</span>}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground">
                {sport.title} Uniforms
              </h1>
            </div>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
              {sport.description}
            </p>
          </div>
        </section>

        {/* Custom Builder Section */}
        {hasChamproBuilder(sport.slug) && (
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Design Your {sport.title} Uniforms
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Use our interactive uniform builder to customize colors, add your team name, 
                  and see your design come to life.
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
                    embedKey={embedKey}
                    height="850px"
                    onCheckout={handleDesignSaved}
                  />

                  {/* Checkout Form */}
                  <div className="mt-8 max-w-2xl mx-auto">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-accent" />
                        Complete Your Order
                      </h3>

                      {champroSessionId ? (
                        <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                          <p className="text-sm text-accent font-medium">
                            ✓ Design saved! Complete the form below to checkout.
                          </p>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-muted border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Complete your design in the builder above, then click "Process Design" to save it.
                          </p>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label htmlFor="quantity">
                            Quantity <span className="text-muted-foreground text-xs">(min {productPricing?.moq || 12})</span>
                          </Label>
                          <Input
                            id="quantity"
                            type="number"
                            min={productPricing?.moq || 12}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(productPricing?.moq || 1, parseInt(e.target.value) || 1))}
                          />
                        </div>

                        {/* Lead Time */}
                        <div className="space-y-2">
                          <Label htmlFor="leadTime">Production Time</Label>
                          <Select value={leadTime} onValueChange={(v) => setLeadTime(v as LeadTimeType)}>
                            <SelectTrigger id="leadTime">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard (3-4 weeks)</SelectItem>
                              <SelectItem value="express">10-Day Rush (+$)</SelectItem>
                              <SelectItem value="express_plus">5-Day Rush (+$$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Team Name */}
                        <div className="space-y-2">
                          <Label htmlFor="teamName">Team Name (optional)</Label>
                          <Input
                            id="teamName"
                            type="text"
                            placeholder="e.g., Wildcats"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                          />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="email">Email (for order updates)</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="coach@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Pricing Summary */}
                      {productPricing && !loadingPricing && (
                        <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground">Price per unit:</span>
                            <span className="font-medium text-foreground">{formatPrice(perUnitPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="font-medium text-foreground">{quantity}</span>
                          </div>
                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-foreground">Subtotal:</span>
                              <span className="text-xl font-bold text-accent">{formatPrice(totalPrice)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              + shipping calculated at checkout
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Checkout Button */}
                      <Button
                        onClick={handleCheckout}
                        disabled={!champroSessionId || isCheckingOut}
                        className="w-full mt-6 btn-cta"
                        size="lg"
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Proceed to Checkout
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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

        {/* Content Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Uniform Types */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {sport.title} Uniform Options
                </h2>
                <p className="text-muted-foreground mb-6">
                  We offer a complete range of {sport.title.toLowerCase()} apparel and accessories 
                  for youth, high school, club, and adult programs.
                </p>
                <ul className="space-y-3">
                  {uniformTypes.map((type, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-foreground">{type}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decoration Options */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Customization Options
                </h2>
                <p className="text-muted-foreground mb-6">
                  Add your team logo, player names, and numbers with our professional 
                  decoration services.
                </p>
                <ul className="space-y-3">
                  {decorationOptions.map((option, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-foreground">{option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA for sports without builder */}
            {!hasChamproBuilder(sport.slug) && (
              <div className="mt-16 text-center p-8 bg-accent/10 rounded-xl border border-accent/20 max-w-3xl mx-auto">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Request a Custom Quote
                </h3>
                <p className="text-muted-foreground mb-6">
                  Contact us for a personalized {sport.title.toLowerCase()} uniform consultation 
                  and quote.
                </p>
                <Button onClick={scrollToQuote} className="btn-cta">
                  Request a {sport.title} Uniform Quote
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Other Sports */}
        <section className="py-16 bg-background border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Explore Other Sports
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {allCards
                .filter((s) => s.id !== sport.id)
                .slice(0, 6)
                .map((s) => (
                  <Link
                    key={s.id}
                    to={`/uniforms/${s.slug}`}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border hover:border-accent hover:shadow-md transition-all"
                  >
                    {s.icon && <span className="text-lg">{s.icon}</span>}
                    <span className="font-medium text-foreground hover:text-accent">
                      {s.title}
                    </span>
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
