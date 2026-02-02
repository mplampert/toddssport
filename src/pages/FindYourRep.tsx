import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, Mail, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  territory_type: string;
  territory_value: string;
  notes: string | null;
}

export default function FindYourRep() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Rep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Temporarily ignore search term - always fetch first 2 reps ordered by id
      const { data, error } = await supabase
        .from("reps")
        .select("*")
        .eq("active", true)
        .order("id")
        .limit(2);

      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error("Error searching reps:", error);
      toast({
        title: "Search failed",
        description: "There was an error searching for representatives. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getTerritoryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      zip: "Zip Code",
      school: "School",
      city: "City",
      league: "League",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Sales Rep
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Enter your school name, city, zip code, or league to find the dedicated representative for your area.
            </p>

            {/* Search Box */}
            <div className="max-w-xl mx-auto flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by school, city, zip, or league..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 h-12 text-foreground bg-background"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                size="lg"
                variant="secondary"
                className="h-12 px-8"
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            {hasSearched && (
              <>
                {results.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      No Representatives Found
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We couldn't find a representative matching "{searchTerm}". Try a different search term or{" "}
                      <a href="/contact" className="text-primary hover:underline">
                        contact us directly
                      </a>
                      .
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
                      {results.length === 1
                        ? "Your Representative"
                        : `${results.length} Representatives Found`}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                      {results.map((rep) => (
                        <Card key={rep.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-xl">{rep.name}</CardTitle>
                              <Badge variant="secondary">
                                {getTerritoryTypeLabel(rep.territory_type)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">{rep.territory_value}</span>
                            </div>
                            {rep.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <a
                                  href={`mailto:${rep.email}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {rep.email}
                                </a>
                              </div>
                            )}
                            {rep.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <a
                                  href={`tel:${rep.phone}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {rep.phone}
                                </a>
                              </div>
                            )}
                            {rep.notes && (
                              <p className="text-sm text-muted-foreground pt-2 border-t">
                                {rep.notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {!hasSearched && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Ready to Help
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Use the search box above to find the sales representative dedicated to your area.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
