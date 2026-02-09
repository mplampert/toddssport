import { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShoppingBag, Calendar, ArrowLeft } from "lucide-react";
import { TeamStoreCartDrawer } from "@/components/team-stores/TeamStoreCartDrawer";
import { StorefrontProductGrid } from "@/components/team-stores/StorefrontProductGrid";
import { StoreMessages } from "@/components/team-stores/StoreMessages";
import { StorePopupMessage } from "@/components/team-stores/StorePopupMessage";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  store_pin: string | null;
}

export default function TeamStoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // First, load basic store info (public view — no PIN exposed)
  const { data: storePublic, isLoading: loadingStore } = useQuery({
    queryKey: ["team-store-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color, store_pin, status, active, hero_image_url, hero_title, hero_subtitle, fundraising_percent")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data as StoreData & { status: string; active: boolean; hero_image_url: string | null; hero_title: string | null; hero_subtitle: string | null };
    },
    enabled: !!slug,
  });

  const requiresPin = storePublic?.store_pin && storePublic.store_pin.trim() !== "";

  // Verify PIN via RPC (only if store requires a PIN)
  const { data: verifiedStore, isError: pinFailed, isLoading: verifying } = useQuery({
    queryKey: ["team-store-verify", slug, submittedPin],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_store_pin", {
        _slug: slug!,
        _pin: submittedPin!,
      });
      if (error) throw error;
      if (!data) throw new Error("Invalid PIN");
      return data as unknown as StoreData;
    },
    enabled: !!submittedPin && !!slug && requiresPin === true,
    retry: false,
  });

  // The active store: either PIN-verified or directly loaded (no PIN)
  const store = requiresPin ? verifiedStore : storePublic;
  const pinVerified = !requiresPin || !!verifiedStore;

  // Load products once store is accessible
  const { data: products = [] } = useQuery({
    queryKey: ["team-store-products-public", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, sort_order, notes, price_override, active, category_id, store_category_override_id, display_name, display_color, primary_image_url, primary_image_type, extra_image_urls, extra_image_types, allowed_colors, fundraising_enabled, fundraising_amount_per_unit, fundraising_percentage, catalog_styles(id, style_id, style_name, brand_name, style_image, description, title)")
        .eq("team_store_id", store!.id)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id && pinVerified,
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!pin.trim()) {
      setError("Please enter the store PIN");
      return;
    }
    setSubmittedPin(pin.trim());
  };

  // Loading
  if (loadingStore) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </main>
        <Footer />
      </div>
    );
  }

  // Store not found
  if (!storePublic) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Store Not Found</h1>
            <p className="text-muted-foreground mt-2">This team store doesn't exist or is no longer active.</p>
            <Button asChild className="mt-6 btn-cta">
              <Link to="/team-stores">Browse Team Stores</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  // Store closed
  // Store closed or draft (draft stores should use preview route)
  if (storePublic.status === "closed" || storePublic.status === "draft" || (!storePublic.active && storePublic.status !== "scheduled")) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            {storePublic.logo_url && (
              <img src={storePublic.logo_url} alt={storePublic.name} className="w-20 h-20 object-contain mx-auto mb-4 rounded-xl bg-muted p-2" />
            )}
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Store Closed</h1>
            <p className="text-muted-foreground mt-2">
              The <span className="font-semibold">{storePublic.name}</span> store is no longer accepting orders.
            </p>
            {storePublic.end_date && (
              <p className="text-sm text-muted-foreground mt-1">
                This store closed on {new Date(storePublic.end_date).toLocaleDateString()}.
              </p>
            )}
            <Button asChild className="mt-6 btn-cta">
              <Link to="/team-stores">Browse Other Stores</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // PIN gate (only if store has a PIN set)
  if (requiresPin && !verifiedStore) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{storePublic.name}</h1>
                <p className="text-muted-foreground mt-2">
                  Enter the PIN provided by your team administrator to access this store.
                </p>
              </div>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(""); }}
                  placeholder="Enter store PIN"
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
                {(error || (submittedPin && pinFailed)) && (
                  <p className="text-sm text-destructive">
                    {error || "Invalid PIN. Please try again."}
                  </p>
                )}
                <Button type="submit" className="w-full btn-cta" disabled={verifying}>
                  {verifying ? "Verifying…" : "Access Store"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Don't have a PIN? Contact your coach or team administrator.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Store content
  const dateRange = store?.start_date || store?.end_date
    ? `${store.start_date ?? "—"} to ${store.end_date ?? "—"}`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative py-16 px-4 min-h-[240px] md:min-h-[320px] flex items-center"
          style={{
            background: storePublic?.hero_image_url
              ? undefined
              : `linear-gradient(135deg, ${store?.primary_color || "#1a1a2e"}dd, ${store?.secondary_color || "#e2e8f0"}99)`,
          }}
        >
          {/* Background image if hero_image_url exists */}
          {storePublic?.hero_image_url && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${storePublic.hero_image_url})` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${store?.primary_color || "#1a1a2e"}e6, ${store?.primary_color || "#1a1a2e"}80, transparent)`,
                }}
              />
            </>
          )}
          <div className="absolute top-4 left-4 z-10">
            <Button variant="ghost" size="sm" asChild className="text-white/80 hover:text-white">
              <Link to="/team-stores">
                <ArrowLeft className="w-4 h-4 mr-1" /> All Stores
              </Link>
            </Button>
          </div>
          <div className="container mx-auto text-center relative z-10">
            {store?.logo_url && (
              <img src={store.logo_url} alt={store.name} className="w-24 h-24 object-contain mx-auto mb-4 rounded-xl bg-white/90 p-2" />
            )}
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              {storePublic?.hero_title || store?.name}
            </h1>
            {storePublic?.hero_subtitle && (
              <p className="text-lg text-white/90 mt-2 drop-shadow max-w-xl mx-auto">
                {storePublic.hero_subtitle}
              </p>
            )}
            {dateRange && (
              <div className="flex items-center justify-center gap-2 mt-3 text-white/90">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{dateRange}</span>
              </div>
            )}
          </div>
        </section>

        {/* Popup Message */}
        <StorePopupMessage storeId={store!.id} />

        {/* Store Messages */}
        <section className="pt-8 px-4">
          <div className="container mx-auto">
            <StoreMessages storeId={store!.id} location="home" />
          </div>
        </section>

        {/* Products */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <StorefrontProductGrid
              storeId={store!.id}
              slug={slug!}
              products={products as any}
              storeFundraisingPct={(storePublic as any)?.fundraising_percent ?? null}
            />
          </div>
        </section>
      </main>
      <Footer />
      <TeamStoreCartDrawer storeId={store?.id} />
    </div>
  );
}
