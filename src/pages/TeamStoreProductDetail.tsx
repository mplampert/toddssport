import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, ArrowLeft, Package, ShoppingCart,
  ChevronLeft, ChevronRight, Truck, Eye,
} from "lucide-react";
import { getProducts, getStyles, formatSSPrice, getStockStatus, type SSProduct, type SSStyle } from "@/lib/ss-activewear";
import { toast } from "sonner";

interface ColorOption {
  name: string;
  code: string;
  frontImage?: string;
  backImage?: string;
  sideImage?: string;
  swatchImage?: string;
  color1?: string;
  color2?: string;
}

export default function TeamStoreProductDetail() {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>();
  const [searchParams] = useSearchParams();
  const previewToken = searchParams.get("token");

  const [products, setProducts] = useState<SSProduct[]>([]);
  const [styleInfo, setStyleInfo] = useState<SSStyle | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Load the team store product row
  const { data: storeProduct, isLoading: loadingItem } = useQuery({
    queryKey: ["ts-product-detail", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("*, catalog_styles(id, style_id, style_name, brand_name, style_image, description), team_stores(id, name, slug, status, primary_color, secondary_color, logo_url, preview_token)")
        .eq("id", itemId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!itemId,
  });

  const store = storeProduct?.team_stores;
  const catalogStyle = storeProduct?.catalog_styles;
  const ssStyleId = catalogStyle?.style_id;

  const isPreview = store?.status !== "open";

  // Fetch full product data from SS API
  useEffect(() => {
    if (!ssStyleId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [productsData, stylesData] = await Promise.all([
          getProducts({ style: String(ssStyleId) }),
          getStyles({ style: String(ssStyleId) }),
        ]);
        const results = Array.isArray(productsData) ? productsData : [];
        setProducts(results);
        if (results[0]?.colorName) setSelectedColor(results[0].colorName);

        const styles = Array.isArray(stylesData) ? stylesData : [];
        const match = styles.find((s) => String(s.styleID) === String(ssStyleId));
        if (match) setStyleInfo(match);
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ssStyleId]);

  /* ── derived data ── */
  const colorOptions = useMemo<ColorOption[]>(() => {
    const map = new Map<string, ColorOption>();
    products.forEach((p) => {
      if (p.colorName && !map.has(p.colorName)) {
        map.set(p.colorName, {
          name: p.colorName,
          code: p.colorCode,
          frontImage: p.colorFrontImage,
          backImage: p.colorBackImage,
          sideImage: p.colorSideImage,
          swatchImage: (p as any).colorSwatchImage,
          color1: (p as any).color1,
          color2: (p as any).color2,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const activeColor = useMemo(
    () => colorOptions.find((c) => c.name === selectedColor) || colorOptions[0],
    [colorOptions, selectedColor]
  );

  const galleryImages = useMemo(() => {
    if (!activeColor) return [];
    return [activeColor.frontImage, activeColor.backImage, activeColor.sideImage].filter(
      (img): img is string => !!img && img.length > 0
    );
  }, [activeColor]);

  const sizesForColor = useMemo(() => {
    return products
      .filter((p) => p.colorName === selectedColor && p.sizeName)
      .sort((a, b) => (a.sizeOrder || "").localeCompare(b.sizeOrder || ""))
      .reduce<SSProduct[]>((acc, p) => {
        if (!acc.find((x) => x.sizeName === p.sizeName)) acc.push(p);
        return acc;
      }, []);
  }, [products, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return products.find((p) => p.colorName === selectedColor && p.sizeName === selectedSize) || null;
  }, [products, selectedColor, selectedSize]);

  const handleColorSelect = useCallback((colorName: string) => {
    setSelectedColor(colorName);
    setSelectedSize("");
    setActiveImageIdx(0);
  }, []);

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error("Please select a color and size.");
      return;
    }
    toast.success(`Added ${quantity}× ${selectedVariant.colorName} / ${selectedVariant.sizeName} to cart`);
  };

  // Store price override takes precedence
  const displayPrice = storeProduct?.price_override;

  const backUrl = isPreview
    ? `/preview/team-store/${slug}${previewToken ? `?token=${previewToken}` : ""}`
    : `/team-stores/${slug}`;

  if (loadingItem) {
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

  if (!storeProduct || !store) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Product Not Found</h1>
            <Button asChild className="mt-6 btn-cta">
              <Link to="/team-stores">Browse Stores</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        {/* Preview banner */}
        {isPreview && (
          <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <Eye className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Preview Mode</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              This store is not live yet. Customers cannot see it.
            </AlertDescription>
          </Alert>
        )}

        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to={backUrl} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              {store.name}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate">
              {styleInfo?.title || catalogStyle?.style_name || "Product"}
            </span>
          </nav>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="ml-3 text-muted-foreground">Loading product details…</span>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* ═══ LEFT: Image Gallery ═══ */}
              <div className="space-y-4">
                <div className="relative bg-card rounded-2xl border border-border overflow-hidden aspect-square flex items-center justify-center group">
                  {galleryImages[activeImageIdx] ? (
                    <img
                      src={galleryImages[activeImageIdx]}
                      alt={`${activeColor?.name || "Product"} view`}
                      className="w-full h-full object-contain p-8 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : catalogStyle?.style_image ? (
                    <img
                      src={catalogStyle.style_image}
                      alt={catalogStyle.style_name}
                      className="w-full h-full object-contain p-8"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-muted-foreground/20" />
                  )}

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIdx((i) => (i === 0 ? galleryImages.length - 1 : i - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveImageIdx((i) => (i === galleryImages.length - 1 ? 0 : i + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {catalogStyle?.brand_name && (
                    <Badge variant="secondary" className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm">
                      {catalogStyle.brand_name}
                    </Badge>
                  )}
                </div>

                {galleryImages.length > 1 && (
                  <div className="flex gap-3 justify-center">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIdx(i)}
                        className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                          i === activeImageIdx
                            ? "border-accent ring-2 ring-accent/20"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══ RIGHT: Product Info ═══ */}
              <div className="flex flex-col">
                {catalogStyle?.brand_name && (
                  <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">
                    {catalogStyle.brand_name}
                  </p>
                )}

                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {styleInfo?.title || catalogStyle?.style_name || "Product"}
                </h1>

                {selectedVariant?.sku && (
                  <p className="text-sm text-muted-foreground mb-4">SKU: {selectedVariant.sku}</p>
                )}

                {/* Price - show store override */}
                <div className="mb-6">
                  {displayPrice != null ? (
                    <span className="text-3xl font-bold text-foreground">
                      ${Number(displayPrice).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-lg text-muted-foreground">Contact for pricing</span>
                  )}
                </div>

                {/* Stock Status */}
                {selectedVariant && (
                  <div className="mb-6">
                    {(() => {
                      const stock = getStockStatus(selectedVariant.qty);
                      return (
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            selectedVariant.qty && selectedVariant.qty > 12 ? "bg-green-500" :
                            selectedVariant.qty && selectedVariant.qty > 0 ? "bg-orange-400" : "bg-destructive"
                          }`} />
                          <span className={`text-sm font-medium ${stock.color}`}>{stock.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Separator className="mb-6" />

                {/* Description */}
                {(styleInfo?.description || catalogStyle?.description) && (
                  <div
                    className="text-sm text-muted-foreground mb-6 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: styleInfo?.description || catalogStyle?.description || "" }}
                  />
                )}

                {/* Color Selector */}
                {colorOptions.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-foreground">
                        Color: <span className="font-normal text-muted-foreground">{selectedColor}</span>
                      </label>
                      <span className="text-xs text-muted-foreground">{colorOptions.length} colors</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => handleColorSelect(c.name)}
                          title={c.name}
                          className={`relative w-10 h-10 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedColor === c.name
                              ? "border-accent ring-2 ring-accent/20 scale-110"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                        >
                          {c.swatchImage ? (
                            <img src={c.swatchImage} alt={c.name} className="w-full h-full object-cover" />
                          ) : c.color1 ? (
                            <div
                              className="w-full h-full"
                              style={{
                                background: c.color2
                                  ? `linear-gradient(135deg, ${c.color1} 50%, ${c.color2} 50%)`
                                  : c.color1,
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-[8px] text-muted-foreground leading-tight text-center px-0.5">
                                {c.name.slice(0, 3)}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {sizesForColor.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-foreground mb-3 block">
                      Size: <span className="font-normal text-muted-foreground">{selectedSize || "Select a size"}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {sizesForColor.map((variant) => {
                        const inStock = variant.qty !== undefined && variant.qty > 0;
                        const isSelected = selectedSize === variant.sizeName;
                        return (
                          <button
                            key={variant.sizeName}
                            onClick={() => setSelectedSize(variant.sizeName!)}
                            disabled={!inStock}
                            className={`min-w-[3rem] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isSelected
                                ? "border-accent bg-accent text-accent-foreground"
                                : inStock
                                ? "border-border bg-card hover:border-accent/50 text-foreground"
                                : "border-border bg-muted text-muted-foreground/40 line-through cursor-not-allowed"
                            }`}
                          >
                            {variant.sizeName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity + Add to Cart */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-foreground hover:bg-muted transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center bg-card">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-2 text-foreground hover:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <Button
                    size="lg"
                    className="flex-1 btn-cta text-base"
                    onClick={handleAddToCart}
                    disabled={!selectedVariant || (selectedVariant.qty !== undefined && selectedVariant.qty === 0)}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {!selectedColor || !selectedSize
                      ? "Select options"
                      : selectedVariant?.qty === 0
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </Button>
                </div>

                {/* Shipping info */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <Truck className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Shipping</p>
                    <p className="text-muted-foreground">Ships directly to you or your organization</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
