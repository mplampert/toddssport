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
  ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { getProducts, getStyles, formatSSPrice, getStockStatus, type SSProduct, type SSStyle } from "@/lib/ss-activewear";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreMessages } from "@/components/team-stores/StoreMessages";
import { handleImageError } from "@/lib/productImages";
import { matchLogosForVariant, type LogoAssignment } from "@/lib/logoMatching";
import { useStorePersonalizationDefaults, resolvePersonalization } from "@/hooks/useStorePersonalization";
import { useStoreDecorationPricingDefaults, resolveDecorationPricing, calculateDecorationUpcharge, DECORATION_METHODS, DECORATION_PLACEMENTS } from "@/hooks/useStoreDecorationPricing";
import { useProductVariantImages, getGalleryForColor } from "@/hooks/useVariantImages";
import { getDefaultColor } from "@/lib/storefrontHero";
import { useTeamStoreCart } from "@/hooks/useTeamStoreCart";
import { TeamStoreCartDrawer } from "@/components/team-stores/TeamStoreCartDrawer";

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
  const [activeLogoView, setActiveLogoView] = useState<string | null>(null);
  const [persName, setPersName] = useState("");
  const [persNumber, setPersNumber] = useState("");
  const { addItem } = useTeamStoreCart();

  // Load the team store product row (without team_stores join — RLS may block non-active stores)
  const { data: storeProduct, isLoading: loadingItem } = useQuery({
    queryKey: ["ts-product-detail", itemId, slug, previewToken],
    queryFn: async () => {
      // Fetch product + catalog info + assigned logos
      const { data: product, error: prodErr } = await supabase
        .from("team_store_products")
        .select("*, catalog_styles(id, style_id, style_name, brand_name, style_image, description), team_store_item_logos(id, store_logo_id, store_logo_variant_id, position, x, y, scale, is_primary, variant_color, variant_size, store_logos(name, file_url), store_logo_variants(file_url))")
        .eq("id", itemId!)
        .maybeSingle();
      if (prodErr) throw prodErr;
      if (!product) return null;

      // Fetch the store — try preview RPC first if we have a token, else direct query
      let storeData: any = null;
      if (previewToken && slug) {
        const { data } = await supabase.rpc("get_store_for_preview", {
          _slug: slug,
          _token: previewToken,
        });
        // RPC returns a single JSON object, not an array
        if (data && typeof data === 'object' && (data as any).id) {
          storeData = data;
        }
      }
      if (!storeData) {
        const { data } = await supabase
          .from("team_stores")
          .select("id, name, slug, status, primary_color, secondary_color, logo_url, preview_token")
          .eq("id", product.team_store_id)
          .maybeSingle();
        storeData = data;
      }

      return { ...product, _store: storeData };
    },
    enabled: !!itemId,
  });

  const store = storeProduct?._store;
  const catalogStyle = storeProduct?.catalog_styles;
  const ssStyleId = catalogStyle?.style_id;
  const allLogos: LogoAssignment[] = (storeProduct as any)?.team_store_item_logos ?? [];

  // Match logos for the currently selected color variant
  const assignedLogos = useMemo(
    () => matchLogosForVariant(allLogos, selectedColor || undefined),
    [allLogos, selectedColor]
  );
  const isPreview = store?.status !== "open";

  // Personalization & decoration pricing
  const storeId = store?.id ?? "";
  const { data: persDefaults } = useStorePersonalizationDefaults(storeId);
  const { data: decoDefaults } = useStoreDecorationPricingDefaults(storeId);
  const { data: variantImages = [] } = useProductVariantImages(itemId);

  const persSettings = useMemo(
    () => resolvePersonalization(persDefaults, storeProduct as any),
    [persDefaults, storeProduct]
  );

  const decoSettings = useMemo(
    () => resolveDecorationPricing(decoDefaults, storeProduct as any),
    [decoDefaults, storeProduct]
  );

  // Build decoration placements from assigned logos
  const decoUpcharge = useMemo(() => {
    const placements = assignedLogos.map((l: any) => ({
      method: l.store_logos?.method || "print",
      placement: l.position || "left_chest",
    }));
    return calculateDecorationUpcharge(decoSettings, placements);
  }, [decoSettings, assignedLogos]);

  const persUpcharge = useMemo(() => {
    let total = 0;
    if (persSettings.enable_name && persName) total += persSettings.name_price;
    if (persSettings.enable_number && persNumber) total += persSettings.number_price;
    return total;
  }, [persSettings, persName, persNumber]);

  // Determine deterministic default color from allowed_colors (same as grid)
  const determinedDefaultColor = useMemo(
    () => getDefaultColor(storeProduct?.allowed_colors),
    [storeProduct?.allowed_colors]
  );

  // Set initial selectedColor to the deterministic default once product loads
  useEffect(() => {
    if (determinedDefaultColor && !selectedColor) {
      setSelectedColor(determinedDefaultColor);
    }
  }, [determinedDefaultColor]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Only set selectedColor from SS data if we don't already have a deterministic default
        if (!determinedDefaultColor && results[0]?.colorName && !selectedColor) {
          setSelectedColor(results[0].colorName);
        }

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
  }, [ssStyleId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── derived data ── */
  // Parse allowed_colors from the store product (if set, filter to only those)
  const allowedColors = useMemo(() => {
    const raw = storeProduct?.allowed_colors;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
    return raw as { code: string; name: string; excludedSizes?: string[] }[];
  }, [storeProduct?.allowed_colors]);

  const allowedColorCodes = useMemo(() => {
    if (!allowedColors) return null;
    return new Set(allowedColors.map((c) => c.code));
  }, [allowedColors]);

  const colorOptions = useMemo<ColorOption[]>(() => {
    const map = new Map<string, ColorOption>();
    products.forEach((p) => {
      if (p.colorName && !map.has(p.colorName)) {
        // If allowed_colors is set, filter to only those color codes
        if (allowedColorCodes && !allowedColorCodes.has(p.colorCode)) return;
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
  }, [products, allowedColorCodes]);

  const activeColor = useMemo(
    () => colorOptions.find((c) => c.name === selectedColor) || colorOptions[0],
    [colorOptions, selectedColor]
  );

  const galleryImages = useMemo(() => {
    // Helper: deduplicate by stripping cache-bust params for comparison
    const baseUrl = (u: string) => u.split("?")[0];
    const dedupe = (urls: string[]) => {
      const seen = new Set<string>();
      return urls.filter((u) => {
        const b = baseUrl(u);
        if (seen.has(b)) return false;
        seen.add(b);
        return true;
      });
    };

    // If variant images exist for the selected color, show ONLY those
    if (selectedColor) {
      const colorGallery = getGalleryForColor(variantImages, selectedColor);
      if (colorGallery.length > 0) {
        return colorGallery;
      }
    }

    // No variant images — build gallery from SS color-specific FLAT images
    // colorFrontImage = flat product shot (no model), from /Images/Color/ path
    // Never use styleImage here — it's always a model shot (/Images/Style/ path)
    const ssColorImgs = activeColor
      ? [activeColor.frontImage, activeColor.backImage, activeColor.sideImage].filter(
          (img): img is string => !!img && img.length > 0
        )
      : [];

    // Add any override images from the product as additional gallery shots
    const overridePrimary = storeProduct?.primary_image_url;
    const overrideExtras = Array.isArray(storeProduct?.extra_image_urls)
      ? (storeProduct.extra_image_urls as string[]).filter((u): u is string => !!u)
      : [];
    const allImgs = [...ssColorImgs, ...(overridePrimary ? [overridePrimary] : []), ...overrideExtras];

    return dedupe(allImgs.filter(Boolean));
  }, [activeColor, storeProduct, selectedColor, variantImages]);

  // Get excluded sizes for the selected color
  const excludedSizesForColor = useMemo(() => {
    if (!allowedColors || !selectedColor) return new Set<string>();
    const activeColorOption = colorOptions.find((c) => c.name === selectedColor);
    if (!activeColorOption) return new Set<string>();
    const match = allowedColors.find((c) => c.code === activeColorOption.code);
    return new Set(match?.excludedSizes || []);
  }, [allowedColors, selectedColor, colorOptions]);

  const sizesForColor = useMemo(() => {
    return products
      .filter((p) => p.colorName === selectedColor && p.sizeName)
      .filter((p) => !excludedSizesForColor.has(p.sizeName!))
      .sort((a, b) => (a.sizeOrder || "").localeCompare(b.sizeOrder || ""))
      .reduce<SSProduct[]>((acc, p) => {
        if (!acc.find((x) => x.sizeName === p.sizeName)) acc.push(p);
        return acc;
      }, []);
  }, [products, selectedColor, excludedSizesForColor]);

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
    if (persSettings.enable_name && persSettings.name_required && !persName.trim()) {
      toast.error(`${persSettings.name_label} is required.`);
      return;
    }
    if (persSettings.enable_number && persSettings.number_required && !persNumber.trim()) {
      toast.error(`${persSettings.number_label} is required.`);
      return;
    }
    const basePrice = Number(displayPrice) || 0;
    const totalUnit = basePrice + decoUpcharge + persUpcharge;
    addItem({
      storeId: store?.id ?? "",
      storeSlug: slug ?? "",
      storeName: store?.name ?? "",
      productId: itemId ?? "",
      styleId: ssStyleId ?? 0,
      productName: storeProduct?.display_name || styleInfo?.title || catalogStyle?.style_name || "Product",
      brandName: catalogStyle?.brand_name ?? "",
      color: selectedVariant.colorName ?? "",
      colorCode: selectedVariant.colorCode ?? "",
      size: selectedVariant.sizeName ?? "",
      sku: selectedVariant.sku ?? "",
      quantity,
      unitPrice: totalUnit,
      basePrice,
      decoUpcharge,
      persUpcharge,
      imageUrl: galleryImages[0] ?? catalogStyle?.style_image ?? null,
      personalization: (persSettings.enable_name || persSettings.enable_number) ? {
        name: persName || undefined,
        number: persNumber || undefined,
        namePrice: persSettings.name_price,
        numberPrice: persSettings.number_price,
      } : undefined,
    });
    toast.success(`Added ${quantity}× ${selectedVariant.colorName} / ${selectedVariant.sizeName} to cart`);
    // Reset personalization after adding
    setPersName("");
    setPersNumber("");
    setQuantity(1);
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
              {storeProduct?.display_name || styleInfo?.title || catalogStyle?.style_name || "Product"}
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
                      onError={handleImageError}
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

                  {/* Logo overlays from assigned placements */}
                  {assignedLogos
                    .filter((logo: any) => {
                      const url = logo.store_logo_variants?.file_url || logo.store_logos?.file_url;
                      if (!url) return false;
                      if (activeLogoView === null) return true;
                      return logo.id === activeLogoView;
                    })
                    .map((logo: any) => {
                      const logoFileUrl = logo.store_logo_variants?.file_url || logo.store_logos?.file_url;
                      return (
                        <img
                          key={logo.id}
                          src={logoFileUrl}
                          alt={logo.store_logos?.name || "Logo"}
                          className="absolute pointer-events-none object-contain"
                          style={{
                            left: `${(logo.x ?? 0.5) * 100}%`,
                            top: `${(logo.y ?? 0.2) * 100}%`,
                            width: `${(logo.scale ?? 0.3) * 100}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      );
                    })}

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

                {/* Placement selector — shown when multiple logo placements exist */}
                {assignedLogos.length > 1 && (
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs text-muted-foreground">View:</span>
                    <button
                      onClick={() => setActiveLogoView(null)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        activeLogoView === null
                          ? "border-accent bg-accent/10 text-accent-foreground font-medium"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      All
                    </button>
                    {assignedLogos.map((logo: any) => (
                      <button
                        key={logo.id}
                        onClick={() => setActiveLogoView(logo.id)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors inline-flex items-center gap-1.5 ${
                          activeLogoView === logo.id
                            ? "border-accent bg-accent/10 text-accent-foreground font-medium"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {logo.store_logos?.file_url && (
                          <img src={logo.store_logos.file_url} alt="" className="w-4 h-4 object-contain" />
                        )}
                        {logo.position || "Logo"}
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
                  {storeProduct?.display_name || styleInfo?.title || catalogStyle?.style_name || "Product"}
                </h1>

                {selectedVariant?.sku && (
                  <p className="text-sm text-muted-foreground mb-4">SKU: {selectedVariant.sku}</p>
                )}

                {/* Price - show store override + upcharges */}
                <div className="mb-4">
                  {displayPrice != null ? (
                    <div>
                      <span className="text-3xl font-bold text-foreground">
                        ${(Number(displayPrice) + decoUpcharge + persUpcharge).toFixed(2)}
                      </span>
                      {(decoUpcharge > 0 || persUpcharge > 0) && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <p>Base: ${Number(displayPrice).toFixed(2)}</p>
                          {decoUpcharge > 0 && <p>Decoration: +${decoUpcharge.toFixed(2)}</p>}
                          {persUpcharge > 0 && <p>Personalization: +${persUpcharge.toFixed(2)}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-lg text-muted-foreground">Contact for pricing</span>
                  )}
                </div>

                {/* Product-level messages */}
                <div className="mb-6">
                  <StoreMessages storeId={store.id} location="product" productId={itemId} />
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

                {/* Personalization inputs */}
                {(persSettings.enable_name || persSettings.enable_number) && (
                  <div className="mb-6 space-y-3">
                    <label className="text-sm font-semibold text-foreground block">Personalization</label>
                    {persSettings.instructions && (
                      <p className="text-xs text-muted-foreground">{persSettings.instructions}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {persSettings.enable_name && (
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {persSettings.name_label}
                            {persSettings.name_required && <span className="text-destructive ml-0.5">*</span>}
                            {persSettings.name_price > 0 && <span className="text-muted-foreground ml-1">(+${persSettings.name_price.toFixed(2)})</span>}
                          </Label>
                          <Input
                            value={persName}
                            onChange={(e) => setPersName(e.target.value)}
                            maxLength={persSettings.name_max_length}
                            placeholder={persSettings.name_label}
                          />
                        </div>
                      )}
                      {persSettings.enable_number && (
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {persSettings.number_label}
                            {persSettings.number_required && <span className="text-destructive ml-0.5">*</span>}
                            {persSettings.number_price > 0 && <span className="text-muted-foreground ml-1">(+${persSettings.number_price.toFixed(2)})</span>}
                          </Label>
                          <Input
                            value={persNumber}
                            onChange={(e) => setPersNumber(e.target.value)}
                            maxLength={persSettings.number_max_length}
                            placeholder={persSettings.number_label}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Store Messages for product page */}
                {store?.id && (
                  <div className="mb-4">
                    <StoreMessages storeId={store.id} location="product" productId={itemId} />
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

              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <TeamStoreCartDrawer storeId={store?.id} />
    </div>
  );
}
