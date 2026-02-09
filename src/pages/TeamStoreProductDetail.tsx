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
import { getDisplayName } from "@/lib/productIdentity";
import { matchLogosForVariant, type LogoAssignment } from "@/lib/logoMatching";
import { useStorePersonalizationDefaults, resolvePersonalization } from "@/hooks/useStorePersonalization";
import { useRosterPlayers, type RosterPlayer } from "@/hooks/useTeamRosters";
import { useStoreDecorationPricingDefaults, resolveDecorationPricing, calculateDecorationUpcharge, DECORATION_METHODS, DECORATION_PLACEMENTS } from "@/hooks/useStoreDecorationPricing";
import { useProductVariantImages, getGalleryForColor, hasImagesForView } from "@/hooks/useVariantImages";
import { getDefaultColor } from "@/lib/storefrontHero";
import { useTeamStoreCart } from "@/hooks/useTeamStoreCart";
import { TeamStoreCartDrawer } from "@/components/team-stores/TeamStoreCartDrawer";
import { VIEW_ORDER, getViewLabel, type ViewEnum } from "@/lib/viewLabels";
import { type TextLayer, resolveTextContent, applyTextTransform } from "@/lib/textLayers";
import { getEffectiveDescription } from "@/lib/productDescriptions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";

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

/** Popup for showing a size chart from the size_charts table */
function SizeChartPopup({ chartId }: { chartId: string }) {
  const { data: chart } = useQuery({
    queryKey: ["size-chart", chartId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("size_charts")
        .select("name, content_type, content_html, file_url")
        .eq("id", chartId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!chartId,
  });

  if (!chart) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-xs text-accent hover:underline flex items-center gap-1">
          <Ruler className="w-3 h-3" /> Size Chart
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chart.name || "Size Chart"}</DialogTitle>
        </DialogHeader>
        {chart.content_type === "html" && chart.content_html && (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: chart.content_html }}
          />
        )}
        {chart.content_type === "image" && chart.file_url && (
          <img src={chart.file_url} alt={chart.name || "Size Chart"} className="w-full rounded" />
        )}
        {chart.content_type === "pdf" && chart.file_url && (
          <a href={chart.file_url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Open Size Chart PDF
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
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
  const [activeProductView, setActiveProductView] = useState<ViewEnum>("front");
  const [persName, setPersName] = useState("");
  const [persNumber, setPersNumber] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { addItem } = useTeamStoreCart();

  // Load the team store product row (without team_stores join — RLS may block non-active stores)
  const { data: storeProduct, isLoading: loadingItem } = useQuery({
    queryKey: ["ts-product-detail", itemId, slug, previewToken],
    queryFn: async () => {
      // Fetch product + catalog info + assigned logos
      const { data: product, error: prodErr } = await supabase
        .from("team_store_products")
        .select("*, catalog_styles(id, style_id, style_name, brand_name, style_image, description, title), team_store_item_logos(id, store_logo_id, store_logo_variant_id, position, x, y, scale, rotation, is_primary, role, sort_order, active, variant_color, variant_size, view, store_logos(name, file_url), store_logo_variants(file_url))")
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
  const allLogos: LogoAssignment[] = ((storeProduct as any)?.team_store_item_logos ?? [])
    .filter((l: any) => l.active !== false)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Match logos for the currently selected color variant, filtered by active view
  const assignedLogos = useMemo(
    () => matchLogosForVariant(allLogos, selectedColor || undefined)
      .filter((l: any) => (l.view || "front") === activeProductView),
    [allLogos, selectedColor, activeProductView]
  );

  // Fetch text layers for this product
  const { data: allTextLayers = [] } = useQuery<TextLayer[]>({
    queryKey: ["item-text-layers-storefront", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_text_layers")
        .select("*")
        .eq("team_store_item_id", itemId!)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as TextLayer[];
    },
    enabled: !!itemId,
  });

  // Text layers for current view
  const viewTextLayers = useMemo(
    () => allTextLayers.filter((t) => (t.view || "front") === activeProductView),
    [allTextLayers, activeProductView]
  );

  const isPreview = store?.status !== "open";

  // Personalization & decoration pricing
  const storeId = store?.id ?? "";
  const { data: persDefaults } = useStorePersonalizationDefaults(storeId);
  const { data: decoDefaults } = useStoreDecorationPricingDefaults(storeId);
  const { data: variantImages = [] } = useProductVariantImages(itemId);
  const rosterEnabled = !!(storeProduct as any)?.team_roster_id;
  const { data: rosterPlayers = [] } = useRosterPlayers(rosterEnabled ? (storeProduct as any)?.team_roster_id : null);
  const lockRule = (storeProduct as any)?.number_lock_rule ?? "none";
  const activePlayers = rosterPlayers.filter((p) => p.status === "active");
  const selectedPlayer = activePlayers.find((p) => p.id === selectedPlayerId) ?? null;

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

  const customFieldsUpcharge = useMemo(() => {
    let total = 0;
    for (const f of persSettings.custom_fields ?? []) {
      const val = customFieldValues[f.id];
      if (val && val.trim()) total += f.price;
    }
    return total;
  }, [persSettings.custom_fields, customFieldValues]);

  const persUpcharge = useMemo(() => {
    let total = 0;
    if (persSettings.enable_name && persName) total += persSettings.name_price;
    if (persSettings.enable_number && persNumber) total += persSettings.number_price;
    total += customFieldsUpcharge;
    return total;
  }, [persSettings, persName, persNumber, customFieldsUpcharge]);

  // Size upcharge lookup
  const sizeUpchargesMap = useMemo<Record<string, number>>(() => {
    const raw = (storeProduct as any)?.size_upcharges;
    if (!raw || typeof raw !== "object") return {};
    return raw as Record<string, number>;
  }, [storeProduct]);

  const getSizeUpcharge = useCallback((sizeName: string) => {
    return sizeUpchargesMap[sizeName] ?? 0;
  }, [sizeUpchargesMap]);

  const currentSizeUpcharge = useMemo(
    () => getSizeUpcharge(selectedSize),
    [getSizeUpcharge, selectedSize]
  );

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

  // Compute which views are active
  // Front: always shown if it has an image.
  // Back/Sleeves: shown only if they have BOTH an image AND a decoration element
  //   (logo placement or, for back, personalization name/number).
  const activeViews = useMemo<ViewEnum[]>(() => {
    const views: ViewEnum[] = [];

    const viewHasImage = (v: ViewEnum): boolean => {
      if (selectedColor && hasImagesForView(variantImages, selectedColor, v)) return true;
      if (v === "front" && activeColor?.frontImage) return true;
      if (v === "back" && activeColor?.backImage) return true;
      if ((v === "left_sleeve" || v === "right_sleeve") && activeColor?.sideImage) return true;
      return false;
    };

    const viewHasDecoration = (v: ViewEnum): boolean => {
      const hasLogos = allLogos.some((l: any) => (l.view || "front") === v);
      if (hasLogos) return true;
      const hasText = allTextLayers.some((t) => (t.view || "front") === v);
      if (hasText) return true;
      if (v === "back" && (persSettings.enable_name || persSettings.enable_number)) return true;
      return false;
    };

    for (const v of VIEW_ORDER) {
      if (v === "front") {
        // Front is always shown if it has an image
        if (viewHasImage(v)) views.push(v);
      } else if (v !== "other") {
        // Back/sleeves: require both image AND decoration
        if (viewHasImage(v) && viewHasDecoration(v)) views.push(v);
      }
    }

    // Ensure front is always present as first entry
    if (!views.includes("front")) views.unshift("front");
    return views;
  }, [selectedColor, variantImages, activeColor, allLogos, allTextLayers, persSettings.enable_name, persSettings.enable_number]);

  const galleryImages = useMemo(() => {
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

    // If variant images exist for the selected color + view, show ONLY those
    if (selectedColor) {
      const colorGallery = getGalleryForColor(variantImages, selectedColor, activeProductView);
      if (colorGallery.length > 0) {
        return colorGallery;
      }
    }

    // No variant images — build gallery from SS color-specific images based on view
    const ssColorImgs = activeColor
      ? activeProductView === "back"
        ? [activeColor.backImage].filter((img): img is string => !!img && img.length > 0)
        : (activeProductView === "left_sleeve" || activeProductView === "right_sleeve")
          ? [activeColor.sideImage].filter((img): img is string => !!img && img.length > 0)
          : [activeColor.frontImage, activeColor.sideImage].filter((img): img is string => !!img && img.length > 0)
      : [];

    // Add any override images from the product as additional gallery shots (front only)
    if (activeProductView === "front") {
      const overridePrimary = storeProduct?.primary_image_url;
      const overrideExtras = Array.isArray(storeProduct?.extra_image_urls)
        ? (storeProduct.extra_image_urls as string[]).filter((u): u is string => !!u)
        : [];
      const allImgs = [...ssColorImgs, ...(overridePrimary ? [overridePrimary] : []), ...overrideExtras];
      return dedupe(allImgs.filter(Boolean));
    }

    return dedupe(ssColorImgs.filter(Boolean));
  }, [activeColor, storeProduct, selectedColor, variantImages, activeProductView]);

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
    setActiveProductView("front");
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
    // Validate required custom fields
    for (const f of persSettings.custom_fields ?? []) {
      if (f.required && (!customFieldValues[f.id] || !customFieldValues[f.id].trim())) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    const basePrice = Number(displayPrice) || 0;
    const sizeUpcharge = getSizeUpcharge(selectedSize);
    const totalUnit = basePrice + sizeUpcharge + decoUpcharge + persUpcharge;
    const hasCustomFields = Object.values(customFieldValues).some((v) => v?.trim());
    addItem({
      storeId: store?.id ?? "",
      storeSlug: slug ?? "",
      storeName: store?.name ?? "",
      productId: itemId ?? "",
      styleId: ssStyleId ?? 0,
      productName: getDisplayName(storeProduct as any),
      brandName: catalogStyle?.brand_name ?? "",
      color: selectedVariant.colorName ?? "",
      colorCode: selectedVariant.colorCode ?? "",
      size: selectedVariant.sizeName ?? "",
      sku: selectedVariant.sku ?? "",
      quantity,
      unitPrice: totalUnit,
      basePrice,
      sizeUpcharge,
      decoUpcharge,
      persUpcharge,
      imageUrl: galleryImages[0] ?? catalogStyle?.style_image ?? null,
      personalization: (persSettings.enable_name || persSettings.enable_number || hasCustomFields || selectedPlayerId) ? {
        name: persName || undefined,
        number: persNumber || undefined,
        namePrice: persSettings.name_price,
        numberPrice: persSettings.number_price,
        customFields: hasCustomFields ? { ...customFieldValues } : undefined,
        customFieldsUpcharge: hasCustomFields ? customFieldsUpcharge : undefined,
        rosterPlayerId: selectedPlayerId || undefined,
        textLayers: allTextLayers.length > 0 ? allTextLayers.filter(t => t.active).map(t => ({
          view: t.view,
          text: applyTextTransform(resolveTextContent(t, { name: persName, number: persNumber, customFields: customFieldValues }), t.text_transform),
          font_family: t.font_family, font_weight: t.font_weight, font_size_px: t.font_size_px,
          fill_color: t.fill_color, outline_color: t.outline_color, outline_thickness: t.outline_thickness,
          x: t.x, y: t.y, scale: t.scale, rotation: t.rotation,
        })) : undefined,
      } : undefined,
    });
    toast.success(`Added ${quantity}× ${selectedVariant.colorName} / ${selectedVariant.sizeName} to cart`);
    // Reset personalization after adding
    setPersName("");
    setPersNumber("");
    setCustomFieldValues({});
    setSelectedPlayerId(null);
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
              {getDisplayName(storeProduct as any)}
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
                <div className="relative bg-card rounded-2xl border border-border overflow-hidden flex items-center justify-center group mx-auto w-full" style={{ aspectRatio: "4/5", maxHeight: "520px" }}>
                  {galleryImages[activeImageIdx] ? (
                    <img
                      src={galleryImages[activeImageIdx]}
                      alt={`${activeColor?.name || "Product"} view`}
                      className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                      onError={handleImageError}
                    />
                  ) : catalogStyle?.style_image ? (
                    <img
                      src={catalogStyle.style_image}
                      alt={catalogStyle.style_name}
                      className="w-full h-full object-contain p-6"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-muted-foreground/20" />
                  )}

                  {/* Logo overlays from assigned placements (already filtered by view) */}
                  {assignedLogos.map((logo: any) => {
                    const logoFileUrl = logo.store_logo_variants?.file_url || logo.store_logos?.file_url;
                    if (!logoFileUrl) return null;
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

                  {/* Text layer overlays with live personalization */}
                  {viewTextLayers.map((t, idx) => {
                    const rawText = resolveTextContent(t, { name: persName, number: persNumber, customFields: customFieldValues });
                    const displayText = applyTextTransform(rawText, t.text_transform);
                    const size = t.scale * 100;
                    return (
                      <div
                        key={`text-${idx}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${t.x * 100}%`,
                          top: `${t.y * 100}%`,
                          width: `${size}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div
                          className="w-full text-center whitespace-nowrap overflow-hidden select-none"
                          style={{
                            fontFamily: t.font_family,
                            fontWeight: t.font_weight,
                            fontSize: `${Math.max(8, Math.round(t.font_size_px * (size / 100)))}px`,
                            color: t.fill_color,
                            letterSpacing: `${t.letter_spacing}px`,
                            lineHeight: t.line_height,
                            textAlign: t.alignment as any,
                            WebkitTextStroke: t.outline_thickness > 0 ? `${t.outline_thickness}px ${t.outline_color || "#000"}` : undefined,
                          }}
                        >
                          {displayText}
                        </div>
                      </div>
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

                {/* View-based thumbnails: one per active view */}
                {activeViews.length > 1 && (
                  <div className="flex gap-3 justify-center overflow-x-auto flex-nowrap">
                    {activeViews.map((v) => {
                      const variantThumb = selectedColor
                        ? getGalleryForColor(variantImages, selectedColor, v)[0]
                        : undefined;
                      const ssThumb = v === "front"
                        ? activeColor?.frontImage
                        : v === "back"
                          ? activeColor?.backImage
                          : (v === "left_sleeve" || v === "right_sleeve")
                            ? activeColor?.sideImage
                            : undefined;
                      const thumbSrc = variantThumb || ssThumb || catalogStyle?.style_image;

                      const viewLogos = matchLogosForVariant(allLogos, selectedColor || undefined)
                        .filter((l: any) => (l.view || "front") === v);

                      return (
                        <button
                          key={v}
                          onClick={() => {
                            setActiveProductView(v);
                            setActiveImageIdx(0);
                          }}
                          className={`relative w-20 h-20 rounded-lg border-2 overflow-hidden transition-all shrink-0 ${
                            activeProductView === v
                              ? "border-accent ring-2 ring-accent/20"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                        >
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt={getViewLabel(v)}
                              className="w-full h-full object-contain p-1"
                              onError={handleImageError}
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground m-auto flex items-center justify-center h-full">
                              {getViewLabel(v)}
                            </span>
                          )}
                          {viewLogos.map((logo: any) => {
                            const logoFileUrl = logo.store_logo_variants?.file_url || logo.store_logos?.file_url;
                            if (!logoFileUrl) return null;
                            return (
                              <img
                                key={logo.id}
                                src={logoFileUrl}
                                alt=""
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
                          <span className="absolute bottom-0 inset-x-0 text-[9px] font-medium text-center bg-background/80 py-0.5 truncate">
                            {getViewLabel(v)}
                          </span>
                        </button>
                      );
                    })}
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
                  {getDisplayName(storeProduct as any)}
                </h1>

                {selectedVariant?.sku && (
                  <p className="text-sm text-muted-foreground mb-4">SKU: {selectedVariant.sku}</p>
                )}

                {/* Price - show store override + upcharges */}
                <div className="mb-4">
                  {displayPrice != null ? (
                    <div>
                      <span className="text-3xl font-bold text-foreground">
                        ${(Number(displayPrice) + currentSizeUpcharge + decoUpcharge + persUpcharge).toFixed(2)}
                      </span>
                      {(currentSizeUpcharge > 0 || decoUpcharge > 0 || persUpcharge > 0) && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <p>Base: ${Number(displayPrice).toFixed(2)}</p>
                          {currentSizeUpcharge > 0 && <p>Size upcharge: +${currentSizeUpcharge.toFixed(2)}</p>}
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

                {/* Description — uses override if set, else vendor/API */}
                {(() => {
                  const effectiveDesc = getEffectiveDescription(storeProduct as any) || styleInfo?.description;
                  if (!effectiveDesc) return null;
                  return (
                    <div
                      className="text-sm text-muted-foreground mb-6 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                      dangerouslySetInnerHTML={{ __html: effectiveDesc }}
                    />
                  );
                })()}

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
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-foreground">
                        Size: <span className="font-normal text-muted-foreground">{selectedSize || "Select a size"}</span>
                      </label>
                      {/* Size Chart link */}
                      {(storeProduct as any)?.size_chart_override_id && (
                        <SizeChartPopup chartId={(storeProduct as any).size_chart_override_id} />
                      )}
                    </div>
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
                          <span className="flex flex-col items-center">
                            <span>{variant.sizeName}</span>
                            {getSizeUpcharge(variant.sizeName!) > 0 && (
                              <span className="text-[9px] opacity-70">+${getSizeUpcharge(variant.sizeName!).toFixed(2)}</span>
                            )}
                          </span>
                          </button>
                        );
                      })}
                    </div>
                    {Object.values(sizeUpchargesMap).some((v) => v > 0) && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">Extended sizes include an upcharge.</p>
                    )}
                  </div>
                )}

                {/* Personalization inputs */}
                {(persSettings.enable_name || persSettings.enable_number || (persSettings.custom_fields ?? []).length > 0 || rosterEnabled) && (
                  <div className="mb-6 space-y-3">
                    <label className="text-sm font-semibold text-foreground block">Personalization</label>
                    {persSettings.instructions && (
                      <p className="text-xs text-muted-foreground">{persSettings.instructions}</p>
                    )}
                    {/* Roster player dropdown */}
                    {rosterEnabled && activePlayers.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Select Your Player</Label>
                        <select
                          value={selectedPlayerId ?? ""}
                          onChange={(e) => {
                            const pid = e.target.value || null;
                            setSelectedPlayerId(pid);
                            const player = activePlayers.find((p) => p.id === pid);
                            if (player) {
                              setPersName(`${player.player_first_name} ${player.player_last_name}`);
                              setPersNumber(player.jersey_number);
                              // Prefill grad_year/birth_year if custom fields exist
                              const cf = { ...customFieldValues };
                              for (const f of persSettings.custom_fields ?? []) {
                                const lbl = f.label.toLowerCase();
                                if (lbl.includes("grad") && player.grad_year) cf[f.id] = String(player.grad_year);
                                if (lbl.includes("birth") && player.birth_year) cf[f.id] = String(player.birth_year);
                              }
                              setCustomFieldValues(cf);
                            } else {
                              setPersName("");
                              setPersNumber("");
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">— Choose a player —</option>
                          {activePlayers.map((p) => {
                            const isTaken = lockRule === "lock_on_first_order" && !!p.claimed_order_item_id;
                            const label = `#${p.jersey_number} – ${p.player_first_name} ${p.player_last_name}${p.grad_year ? ` – ${p.grad_year}` : ""}`;
                            return (
                              <option key={p.id} value={p.id} disabled={isTaken}>
                                {label}{isTaken ? " (Taken)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
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
                      {(persSettings.custom_fields ?? []).map((field) => (
                        <div key={field.id} className="space-y-1">
                          <Label className="text-xs">
                            {field.label}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                            {field.price > 0 && <span className="text-muted-foreground ml-1">(+${field.price.toFixed(2)})</span>}
                          </Label>
                          {field.type === "dropdown" ? (
                            <select
                              value={customFieldValues[field.id] || ""}
                              onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Select {field.label}…</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={customFieldValues[field.id] || ""}
                              onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                              maxLength={field.max_length}
                              placeholder={field.label}
                            />
                          )}
                        </div>
                      ))}
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
