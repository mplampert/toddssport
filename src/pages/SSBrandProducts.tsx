import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Package, ArrowLeft, Filter } from "lucide-react";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";

export default function SSBrandProducts() {
  const { brandName } = useParams<{ brandName: string }>();
  const decodedBrand = brandName ? decodeURIComponent(brandName) : "";

  const [styles, setStyles] = useState<SSStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

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

  const baseCategories = useMemo(() => {
    const set = new Set(styles.map((s) => s.baseCategory).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [styles]);

  const filtered = useMemo(() => {
    let result = styles;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.styleName?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.partNumber?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((s) => s.baseCategory === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "category") return (a.baseCategory || "").localeCompare(b.baseCategory || "");
      return (a.styleName || "").localeCompare(b.styleName || "");
    });

    return result;
  }, [styles, search, categoryFilter, sortBy]);

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
              Browse all {decodedBrand} blank apparel styles with real-time pricing &amp; inventory.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-border bg-card sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by style or part number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {baseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-2">
                <Filter className="w-3 h-3 inline mr-1" />
                {filtered.length.toLocaleString()} styles found
              </p>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading {decodedBrand} products…</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.slice(0, 100).map((style) => (
                  <Link
                    key={style.styleID}
                    to={`/ss-products/${style.styleID}`}
                    className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative h-48 bg-secondary overflow-hidden">
                      {style.styleImage ? (
                        <img
                          src={style.styleImage}
                          alt={style.styleName}
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-accent transition-colors line-clamp-2">
                        {style.title || style.styleName}
                      </h3>
                      {style.partNumber && (
                        <p className="text-xs text-muted-foreground mb-2">SKU: {style.partNumber}</p>
                      )}
                      {style.baseCategory && (
                        <p className="text-xs text-muted-foreground mt-auto">{style.baseCategory}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {filtered.length > 100 && (
              <p className="text-center text-muted-foreground mt-8">
                Showing first 100 of {filtered.length.toLocaleString()} results. Refine your search to see more.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
