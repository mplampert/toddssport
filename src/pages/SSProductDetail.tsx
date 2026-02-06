import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Package, ShoppingCart, Check } from "lucide-react";
import { getProducts, formatSSPrice, getStockStatus, type SSProduct } from "@/lib/ss-activewear";
import { toast } from "sonner";

export default function SSProductDetail() {
  const { styleId } = useParams<{ styleId: string }>();
  const [products, setProducts] = useState<SSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");

  useEffect(() => {
    if (!styleId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProducts({ style: styleId });
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load product details:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [styleId]);

  const colors = useMemo(() => {
    const map = new Map<string, { name: string; image?: string }>();
    products.forEach((p) => {
      if (p.colorName && !map.has(p.colorName)) {
        map.set(p.colorName, { name: p.colorName, image: p.colorFrontImage });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.sizeName) set.add(p.sizeName); });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedColor !== "all") result = result.filter((p) => p.colorName === selectedColor);
    if (selectedSize !== "all") result = result.filter((p) => p.sizeName === selectedSize);
    return result;
  }, [products, selectedColor, selectedSize]);

  const heroProduct = products[0];
  const heroImage = selectedColor !== "all"
    ? colors.find((c) => c.name === selectedColor)?.image
    : heroProduct?.colorFrontImage;

  const handleAddToCart = (product: SSProduct) => {
    // Placeholder — will hook into existing cart system
    toast.success(`Added ${product.colorName} / ${product.sizeName} to cart`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-secondary/30">
        <div className="container mx-auto px-4 py-8">
          <Link
            to="/ss-products"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Product not found</h3>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                {/* Image */}
                <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center min-h-[360px]">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt="Product"
                      className="max-h-80 object-contain"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-muted-foreground/20" />
                  )}
                </div>

                {/* Info */}
                <div>
                  {heroProduct?.brandName && (
                    <Badge variant="secondary" className="mb-3">{heroProduct.brandName}</Badge>
                  )}
                  <h1 className="text-3xl font-bold text-foreground mb-4">
                    Style #{styleId}
                  </h1>

                  {/* Color selector */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-foreground mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedColor === "all" ? "default" : "outline"}
                        onClick={() => setSelectedColor("all")}
                      >
                        All ({colors.length})
                      </Button>
                      {colors.slice(0, 20).map((c) => (
                        <Button
                          key={c.name}
                          size="sm"
                          variant={selectedColor === c.name ? "default" : "outline"}
                          onClick={() => setSelectedColor(c.name)}
                        >
                          {c.name}
                        </Button>
                      ))}
                      {colors.length > 20 && (
                        <span className="text-xs text-muted-foreground self-center">+{colors.length - 20} more</span>
                      )}
                    </div>
                  </div>

                  {/* Size selector */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-foreground mb-2 block">Size</label>
                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Sizes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        {sizes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {filtered.length} variant{filtered.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              {/* Variants Table */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary/50 text-left">
                        <th className="px-4 py-3 font-semibold">Color</th>
                        <th className="px-4 py-3 font-semibold">Size</th>
                        <th className="px-4 py-3 font-semibold text-right">Piece Price</th>
                        <th className="px-4 py-3 font-semibold text-right">Dozen Price</th>
                        <th className="px-4 py-3 font-semibold text-right">Case Price</th>
                        <th className="px-4 py-3 font-semibold text-center">Stock</th>
                        <th className="px-4 py-3 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 50).map((p, i) => {
                        const stock = getStockStatus(p.qty);
                        return (
                          <tr key={`${p.productId}-${i}`} className="border-t border-border hover:bg-secondary/20">
                            <td className="px-4 py-3">{p.colorName}</td>
                            <td className="px-4 py-3">{p.sizeName}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatSSPrice(p.piecePrice)}</td>
                            <td className="px-4 py-3 text-right">{formatSSPrice(p.dozenPrice)}</td>
                            <td className="px-4 py-3 text-right">{formatSSPrice(p.casePrice)}</td>
                            <td className={`px-4 py-3 text-center text-xs font-medium ${stock.color}`}>
                              {stock.label}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToCart(p)}
                                disabled={p.qty === 0}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filtered.length > 50 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Showing 50 of {filtered.length} variants. Narrow by color/size to see more.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
