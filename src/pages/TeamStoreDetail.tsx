import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShoppingBag, Calendar } from "lucide-react";

export default function TeamStoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Verify PIN via RPC
  const { data: store, isLoading, isError } = useQuery({
    queryKey: ["team-store-verify", slug, submittedPin],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_store_pin", {
        _slug: slug!,
        _pin: submittedPin!,
      });
      if (error) throw error;
      if (!data) throw new Error("Invalid PIN");
      return data as {
        id: string;
        name: string;
        slug: string;
        start_date: string | null;
        end_date: string | null;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
      };
    },
    enabled: !!submittedPin && !!slug,
    retry: false,
  });

  // Load products once verified
  const { data: products = [] } = useQuery({
    queryKey: ["team-store-products-public", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, sort_order, catalog_styles(id, style_name, brand_name, style_image, description)")
        .eq("team_store_id", store!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
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

  // Show error if PIN was wrong
  const pinFailed = submittedPin && isError;

  // PIN entry gate
  if (!store) {
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
                <h1 className="text-2xl font-bold text-foreground">Team Store Access</h1>
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
                {(error || pinFailed) && (
                  <p className="text-sm text-destructive">
                    {error || "Invalid PIN or store not found. Please try again."}
                  </p>
                )}
                <Button type="submit" className="w-full btn-cta" disabled={isLoading}>
                  {isLoading ? "Verifying…" : "Access Store"}
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

  // Verified — show store
  const dateRange = store.start_date || store.end_date
    ? `${store.start_date ?? "—"} to ${store.end_date ?? "—"}`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section
          className="py-16 px-4"
          style={{
            background: `linear-gradient(135deg, ${store.primary_color}dd, ${store.secondary_color}99)`,
          }}
        >
          <div className="container mx-auto text-center">
            {store.logo_url && (
              <img src={store.logo_url} alt={store.name} className="w-24 h-24 object-contain mx-auto mb-4 rounded-xl bg-white/90 p-2" />
            )}
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">{store.name}</h1>
            {dateRange && (
              <div className="flex items-center justify-center gap-2 mt-3 text-white/90">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{dateRange}</span>
              </div>
            )}
          </div>
        </section>

        {/* Products */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            {products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products have been added to this store yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((item: any) => {
                  const style = item.catalog_styles;
                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {style?.style_image && (
                        <div className="aspect-square bg-muted flex items-center justify-center p-4">
                          <img src={style.style_image} alt={style.style_name} className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground">{style?.style_name ?? "Product"}</h3>
                        <p className="text-sm text-muted-foreground">{style?.brand_name}</p>
                        {style?.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{style.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
