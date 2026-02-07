import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { trackProductView } from "@/lib/ga4";
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
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Package, ShoppingCart, Check, Truck, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { getProducts, getStyles, formatSSPrice, getStockStatus, type SSProduct, type SSStyle } from "@/lib/ss-activewear";
import { toast } from "sonner";

/* ───── colour-image type ───── */
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

export default function SSProductDetail() {
  const { styleId } = useParams<{ styleId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<SSProduct[]>([]);
  const [styleInfo, setStyleInfo] = useState<SSStyle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  /* ───── data fetch ───── */
  useEffect(() => {
    if (!styleId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productsData, stylesData] = await Promise.all([
          getProducts({ style: styleId }),
          getStyles({ style: styleId }),
        ]);
        const results = Array.isArray(productsData) ? productsData : [];
        if (results.length === 0) {
          toast.error("This product is no longer available.");
          navigate("/ss-products", { replace: true });
          return;
        }
        setProducts(results);

        // Pre-select first color
        if (results[0]?.colorName) setSelectedColor(results[0].colorName);

        const styles = Array.isArray(stylesData) ? stylesData : [];
        const match = styles.find((s) => String(s.styleID) === styleId);
        if (match) setStyleInfo(match);
      } catch (err) {
        console.error("Failed to load product details:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [styleId]);

  // Track product view once data loads
  useEffect(() => {
    if (styleInfo && products.length > 0) {
      trackProductView(
        styleInfo.title || styleInfo.styleName || `Style ${styleId}`,
        products[0].brandName
      );
    }
  }, [styleInfo, products]);

  const heroProduct = products[0];

  /* ───── derived data ───── */
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

  const priceRange = useMemo(() => {
    const colorProducts = products.filter((p) => p.colorName === selectedColor);
    if (colorProducts.length === 0) return null;
    const prices = colorProducts.map((p) => p.piecePrice).filter((p): p is number => !!p && p > 0);
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, same: min === max };
  }, [products, selectedColor]);

  /* ───── handlers ───── */
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

  const handleRequestQuote = () => {
    const productName = styleInfo?.title || styleInfo?.styleName || `Style ${styleId}`;
    navigate(`/contact?product=${encodeURIComponent(productName)}`);
  };

  /* ───── render ───── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/ss-products" className="hover:text-foreground transition-colors">
              Blank Apparel
            </Link>
            <span>/</span>
            {heroProduct?.brandName && (
              <>
                <Link
                  to={`/ss-products/brand/${encodeURIComponent(heroProduct.brandName)}`}
                  className="hover:text-foreground transition-colors"
                >
                  {heroProduct.brandName}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate">
              {styleInfo?.title || styleInfo?.styleName || `Style ${styleId}`}
            </span>
          </nav>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="ml-3 text-muted-foreground">Loading product…</span>
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
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* ═══ LEFT: Image Gallery ═══ */}
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative bg-card rounded-2xl border border-border overflow-hidden aspect-square flex items-center justify-center group">
                  {galleryImages[activeImageIdx] ? (
                    <img
                      src={galleryImages[activeImageIdx]}
                      alt={`${activeColor?.name || "Product"} view`}
                      className="w-full h-full object-contain p-8 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-muted-foreground/20" />
                  )}

                  {/* Navigation arrows */}
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

                  {/* Brand badge */}
                  {heroProduct?.brandName && (
                    <Badge variant="secondary" className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm">
                      {heroProduct.brandName}
                    </Badge>
                  )}
                </div>

                {/* Thumbnails */}
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
                {/* Brand */}
                {heroProduct?.brandName && (
                  <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">
                    {heroProduct.brandName}
                  </p>
                )}

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {styleInfo?.title || styleInfo?.styleName || `Style #${styleId}`}
                </h1>

                {/* SKU */}
                {selectedVariant?.sku ? (
                  <p className="text-sm text-muted-foreground mb-4">SKU: {selectedVariant.sku}</p>
                ) : heroProduct?.sku ? (
                  <p className="text-sm text-muted-foreground mb-4">SKU: {heroProduct.sku}</p>
                ) : null}

                {/* Price */}
                <div className="mb-6">
                  {selectedVariant?.piecePrice ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-foreground">
                        {formatSSPrice(selectedVariant.piecePrice)}
                      </span>
                      {selectedVariant.dozenPrice && selectedVariant.dozenPrice !== selectedVariant.piecePrice && (
                        <span className="text-sm text-muted-foreground">
                          {formatSSPrice(selectedVariant.dozenPrice)}/ea dozen
                        </span>
                      )}
                      {selectedVariant.casePrice && selectedVariant.casePrice !== selectedVariant.piecePrice && (
                        <span className="text-sm text-muted-foreground">
                          {formatSSPrice(selectedVariant.casePrice)}/ea case
                        </span>
                      )}
                    </div>
                  ) : priceRange ? (
                    <span className="text-3xl font-bold text-foreground">
                      {priceRange.same
                        ? formatSSPrice(priceRange.min)
                        : `${formatSSPrice(priceRange.min)} – ${formatSSPrice(priceRange.max)}`}
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
                          <span className={`text-sm font-medium ${stock.color}`}>
                            {stock.label}
                          </span>
                          {selectedVariant.qty && selectedVariant.qty > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({selectedVariant.qty.toLocaleString()} available)
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Separator className="mb-6" />

                {/* Description */}
                {styleInfo?.description && (
                  <div
                    className="text-sm text-muted-foreground mb-6 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: styleInfo.description }}
                  />
                )}

                {/* ── Color Selector ── */}
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

                {/* ── Size Selector ── */}
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
                  {sizesForColor.length === 0 && selectedColor && (
                    <p className="text-sm text-muted-foreground mt-2">No sizes available for this color.</p>
                  )}
                </div>

                {/* ── Quantity + Add to Cart ── */}
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

                {/* Request a Quote */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full mb-6"
                  onClick={handleRequestQuote}
                >
                  Request a Quote for Bulk / Decorated Orders
                </Button>

                {/* Shipping info */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <Truck className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Fast Shipping</p>
                    <p className="text-muted-foreground">Ships from S&S Activewear warehouses nationwide</p>
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
