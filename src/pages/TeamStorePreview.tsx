import { useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShoppingBag, Calendar, ArrowLeft, Eye, Rocket } from "lucide-react";
import { TeamStoreCartDrawer } from "@/components/team-stores/TeamStoreCartDrawer";
import { toast } from "sonner";
import { StorefrontProductGrid } from "@/components/team-stores/StorefrontProductGrid";
import { StoreMessages } from "@/components/team-stores/StoreMessages";

export default function TeamStorePreview() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = searchParams.get("token");
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // kept for potential future use

  // Check if user is a logged-in admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  // Load store via preview token or admin auth
  const { data: store, isLoading, error: loadError } = useQuery({
    queryKey: ["team-store-preview", slug, token],
    queryFn: async () => {
      // If we have a token, use the secure RPC
      if (token) {
        const { data, error } = await supabase.rpc("get_store_for_preview", {
          _slug: slug!,
          _token: token,
        });
        if (error) throw error;
        if (!data) throw new Error("not_found");
        return data as any;
      }

      // Otherwise require admin
      if (!isAdmin) throw new Error("unauthorized");

      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color, store_pin, status, active, description, hero_title, hero_subtitle, fundraising_percent, store_type")
        .eq("slug", slug!)
        .in("status", ["draft", "open", "scheduled"])
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug && (!!token || isAdmin !== undefined),
    retry: false,
  });

  // Load products
  const { data: products = [] } = useQuery({
    queryKey: ["team-store-products-preview", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, sort_order, notes, price_override, active, category_id, store_category_override_id, display_name, display_color, primary_image_url, primary_image_type, extra_image_urls, extra_image_types, allowed_colors, catalog_styles(id, style_id, style_name, brand_name, style_image, description)")
        .eq("team_store_id", store!.id)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Open Store mutation
  const openStoreMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({ status: "open", active: true })
        .eq("id", store!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-preview"] });
      toast.success("Store is now live!");
      navigate(`/team-stores/${store!.slug}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
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

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Preview Not Available</h1>
            <p className="text-muted-foreground mt-2">
              {loadError?.message === "unauthorized"
                ? "You must be logged in as an admin or use a valid preview link."
                : "This store doesn't exist or the preview link has expired."}
            </p>
            <Button asChild className="mt-6 btn-cta">
              <Link to="/team-stores">Browse Team Stores</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isDraft = store.status !== "open";
  const dateRange = store.start_date || store.end_date
    ? `${store.start_date ?? "—"} to ${store.end_date ?? "—"}`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Preview Banner */}
        {isDraft && (
          <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <Eye className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Preview Mode</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-amber-700 dark:text-amber-300">
                This store is not live. Customers cannot see it until status is Open.
              </span>
              <Button
                size="sm"
                onClick={() => openStoreMutation.mutate()}
                disabled={openStoreMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Rocket className="w-4 h-4 mr-1.5" />
                {openStoreMutation.isPending ? "Opening…" : "Open Store"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Hero */}
        <section
          className="py-16 px-4"
          style={{
            background: `linear-gradient(135deg, ${store.primary_color || "#1a1a2e"}dd, ${store.secondary_color || "#e2e8f0"}99)`,
          }}
        >
          <div className="container mx-auto text-center">
            <Button variant="ghost" size="sm" asChild className="text-white/80 hover:text-white mb-4">
              <Link to="/team-stores">
                <ArrowLeft className="w-4 h-4 mr-1" /> All Stores
              </Link>
            </Button>
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
              basePath={`/preview/team-store/${slug}`}
              urlSuffix={token ? `?token=${token}` : ""}
            />
          </div>
        </section>
      </main>
      <Footer />
      <TeamStoreCartDrawer storeId={store?.id} />
    </div>
  );
}
