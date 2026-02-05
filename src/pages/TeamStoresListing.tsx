import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicTeamStore {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function TeamStoresListing() {
  const today = new Date().toISOString().split("T")[0];

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["public-team-stores"],
    queryFn: async () => {
      // Fetch active stores — date filtering done client-side for flexibility
      const { data, error } = await supabase
        .from("team_stores_public")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as PublicTeamStore[]).filter((s) => {
        if (s.start_date && s.start_date > today) return false;
        if (s.end_date && s.end_date < today) return false;
        return true;
      });
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl font-bold text-foreground">Team Stores</h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Shop your team's custom gear. Find your team below and get started.
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="container mx-auto">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team stores are currently open.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => {
                  const closing = store.end_date;
                  return (
                    <Link key={store.id} to={`/team-stores/${store.slug}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-all group h-full">
                        <div
                          className="h-32 flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${store.primary_color || "#1a1a2e"}dd, ${store.secondary_color || "#e2e8f0"}99)`,
                          }}
                        >
                          {store.logo_url ? (
                            <img
                              src={store.logo_url}
                              alt={store.name}
                              className="w-20 h-20 object-contain rounded-xl bg-white/90 p-2"
                            />
                          ) : (
                            <ShoppingBag className="w-12 h-12 text-white/80" />
                          )}
                        </div>
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                            {store.name}
                          </h3>
                          {closing && (
                            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Closes {closing}</span>
                            </div>
                          )}
                          <Button variant="link" className="mt-3 p-0 h-auto text-accent">
                            Shop Store <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
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
