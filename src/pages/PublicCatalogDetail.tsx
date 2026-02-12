import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Share2, Check, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProducts, getStyles, type SSProduct, type SSStyle } from "@/lib/ss-activewear";
import { toast } from "sonner";
import { useInquiryCart } from "@/hooks/useInquiryCart";
import { openInquiryDrawer } from "@/components/catalog/InquiryCartDrawer";

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

export default function PublicCatalogDetail() {
  const { styleId } = useParams<{ styleId: string }>();

  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Determine if this is a UUID (master_products.id) or a numeric style_id (legacy)
  const isUuid = styleId ? /^[0-9a-f]{8}-/.test(styleId) : false;
  const isNumeric = styleId ? /^\d+$/.test(styleId) : false;

  // Fetch from master_products (by UUID id, or by source_sku for legacy numeric links)
  const { data: masterProduct, isLoading: loadingMaster } = useQuery({
    queryKey: ["public-catalog-master", styleId],
    queryFn: async () => {
      let query = supabase
        .from("master_products")
        .select("*, brands!master_products_brand_id_fkey(name, logo_url)")
        .eq("active", true);

      if (isUuid) {
        query = query.eq("id", styleId!);
      } else if (isNumeric) {
        query = query.eq("source_sku", styleId!);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!styleId,
  });

  // Also try catalog_styles for legacy numeric links (specs, extra metadata)
  const { data: catalogStyle, isLoading: loadingCatalog } = useQuery({
    queryKey: ["public-catalog-style", styleId, masterProduct?.source_sku],
    queryFn: async () => {
      const sku = isNumeric ? styleId : masterProduct?.source_sku;
      if (!sku) return null;

      // First try by style_name (S&S styleName, e.g. "18500")
      const { data: byName } = await supabase
        .from("catalog_styles")
        .select("*")
        .eq("style_name", sku)
        .eq("is_active", true)
        .maybeSingle();
      if (byName) return byName;

      // Then try by numeric style_id
      if (/^\d+$/.test(sku)) {
        const { data: byId } = await supabase
          .from("catalog_styles")
          .select("*")
          .eq("style_id", Number(sku))
          .eq("is_active", true)
          .maybeSingle();
        if (byId) return byId;
      }

      // Also try by part_number
      const { data: byPart } = await supabase
        .from("catalog_styles")
        .select("*")
        .eq("part_number", sku)
        .eq("is_active", true)
        .maybeSingle();
      return byPart || null;
    },
    enabled: !!styleId && (isNumeric || !!masterProduct?.source_sku),
  });

  // Determine the S&S style code for enrichment
  const ssStyleCode = useMemo(() => {
    if (masterProduct?.source === "ss_activewear") {
      return (masterProduct as any)?.style_code || masterProduct.source_sku || null;
    }
    if (isNumeric) return styleId;
    return null;
  }, [masterProduct, isNumeric, styleId]);

  // Fetch style details from S&S first (styles endpoint accepts styleName like "18500")
  const { data: ssStyleInfo } = useQuery({
    queryKey: ["public-catalog-ss-style", ssStyleCode],
    queryFn: async () => {
      try {
        const data = await getStyles({ style: ssStyleCode! });
        const styles = Array.isArray(data) ? data : [];
        return styles.find((s) => String(s.styleID) === ssStyleCode || s.styleName === ssStyleCode) || styles[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!ssStyleCode,
  });

  // Resolve the REAL numeric S&S styleID for the products endpoint
  const ssNumericStyleId = useMemo(() => {
    if (catalogStyle?.style_id) return String(catalogStyle.style_id);
    // Use the styleID returned by the S&S styles endpoint (e.g. 395 for styleName "18500")
    if (ssStyleInfo?.styleID) return String(ssStyleInfo.styleID);
    return null;
  }, [catalogStyle, ssStyleInfo]);

  // Fetch pre-imported color images from product_color_images table
  const { data: dbColorImages = [] } = useQuery({
    queryKey: ["product-color-images", masterProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_color_images")
        .select("*")
        .eq("master_product_id", masterProduct!.id)
        .order("color_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!masterProduct?.id,
  });

  // Fetch color/size data from S&S via edge function (fallback for products without DB colors)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["public-catalog-products", ssNumericStyleId],
    queryFn: async () => {
      try {
        const data = await getProducts({ style: ssNumericStyleId! });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!ssNumericStyleId && dbColorImages.length === 0,
  });


  // Fetch specs (only for S&S products with catalog_styles data)
  const resolvedStyleId = catalogStyle?.style_id || (ssStyleCode && /^\d+$/.test(ssStyleCode) ? Number(ssStyleCode) : null);
  const { data: specs = [] } = useQuery({
    queryKey: ["public-catalog-specs", resolvedStyleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_specs")
        .select("spec_name, value")
        .eq("style_id", resolvedStyleId!)
        .not("value", "is", null);
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach((s) => {
        if (s.value && !map.has(s.spec_name)) map.set(s.spec_name, s.value);
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
    enabled: !!resolvedStyleId,
  });

  // Pre-select first color
  useEffect(() => {
    if (!selectedColor) {
      if (dbColorImages.length > 0) {
        setSelectedColor(dbColorImages[0].color_name);
      } else if (products.length > 0) {
        setSelectedColor(products[0].colorName);
      }
    }
  }, [dbColorImages, products, selectedColor]);

  // Build color options: prefer DB-stored colors, fall back to live API
  const colorOptions = useMemo<ColorOption[]>(() => {
    if (dbColorImages.length > 0) {
      return dbColorImages.map((img) => ({
        name: img.color_name,
        code: img.color_code || "",
        frontImage: img.front_image_url || undefined,
        backImage: img.back_image_url || undefined,
        sideImage: img.side_image_url || undefined,
        swatchImage: img.swatch_image_url || undefined,
        color1: img.color1 || undefined,
        color2: img.color2 || undefined,
      }));
    }
    // Fallback to live S&S API data
    const map = new Map<string, ColorOption>();
    products.forEach((p) => {
      if (p.colorName && !map.has(p.colorName)) {
        map.set(p.colorName, {
          name: p.colorName,
          code: p.colorCode,
          frontImage: p.colorFrontImage,
          backImage: p.colorBackImage,
          sideImage: p.colorSideImage,
          swatchImage: p.colorSwatchImage,
          color1: p.color1,
          color2: p.color2,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbColorImages, products]);

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

  // Size range
  const sizeRange = useMemo(() => {
    const sizes = products
      .filter((p) => p.sizeName)
      .map((p) => p.sizeName)
      .filter((v, i, a) => a.indexOf(v) === i);
    return sizes;
  }, [products]);

  // Resolve display values from master_products first, fall back to catalog_styles / S&S
  const brandName = (masterProduct as any)?.brands?.name || catalogStyle?.brand_name || products[0]?.brandName || "";
  const productName = masterProduct?.name || catalogStyle?.title || catalogStyle?.style_name || ssStyleInfo?.title || ssStyleInfo?.styleName || `Style #${styleId}`;
  const partNumber = (masterProduct as any)?.style_code || masterProduct?.source_sku || catalogStyle?.part_number || ssStyleInfo?.partNumber || "";
  const description = masterProduct?.description_short || catalogStyle?.description || ssStyleInfo?.description || "";
  const mainImage = masterProduct?.image_url || catalogStyle?.style_image || null;


  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Product link copied to clipboard!");
    }).catch(() => {
      toast.error("Could not copy link.");
    });
  };

  const isLoading = loadingMaster || (!!ssStyleCode && loadingProducts && dbColorImages.length === 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/catalog" className="hover:text-foreground transition-colors">
              Catalog
            </Link>
            <span>/</span>
            {brandName && (
              <>
                <span>{brandName}</span>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate">{productName}</span>
          </nav>

          {isLoading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : !masterProduct && !catalogStyle ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Product not found</h3>
              <p className="text-muted-foreground mb-4">This product may no longer be available.</p>
              <Link to="/catalog">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Catalog
                </Button>
              </Link>
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
                  ) : mainImage ? (
                    <img
                      src={mainImage}
                      alt={productName}
                      className="w-full h-full object-contain p-8"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-muted-foreground/20" />
                  )}

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIdx((i) => (i === 0 ? galleryImages.length - 1 : i - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveImageIdx((i) => (i === galleryImages.length - 1 ? 0 : i + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {brandName && (
                    <Badge variant="secondary" className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm">
                      {brandName}
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
                {brandName && (
                  <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">
                    {brandName}
                  </p>
                )}

                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {productName}
                </h1>

                {partNumber && (
                  <p className="text-sm text-muted-foreground mb-4">Style: #{partNumber}</p>
                )}

                <p className="text-lg font-semibold text-foreground mb-4">
                  Contact us for pricing
                </p>

                <Separator className="mb-6" />

                {/* Description */}
                {description && (
                  <div
                    className="text-sm text-muted-foreground mb-6 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                )}

                {/* Color Swatches */}
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
                          onClick={() => { setSelectedColor(c.name); setActiveImageIdx(0); }}
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
                              <span className="text-[8px] text-muted-foreground">{c.name.slice(0, 3)}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size range */}
                {sizeRange.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Available Sizes
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {sizeRange.join(", ")}
                    </p>
                  </div>
                )}

                {/* Specs */}
                {specs.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Product Specs
                    </label>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {specs.slice(0, 10).map((s) => (
                        <div key={s.name} className="flex justify-between text-sm py-1 border-b border-border/50">
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="text-foreground font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="mb-6" />

                {/* CTA Buttons */}
                <div className="space-y-3">
                  {/* Add to Inquiry List */}
                  <AddToInquiryButton
                    productId={masterProduct?.id || styleId || ""}
                    name={productName}
                    brand={brandName}
                    sourceSku={partNumber}
                    color={selectedColor}
                    imageUrl={galleryImages[0] || mainImage || null}
                  />


                  <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with Team
                  </Button>
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

function AddToInquiryButton({
  productId,
  name,
  brand,
  sourceSku,
  color,
  imageUrl,
}: {
  productId: string;
  name: string;
  brand: string;
  sourceSku: string;
  color: string | null;
  imageUrl: string | null;
}) {
  const { addItem, isInCart } = useInquiryCart();
  const inCart = isInCart(productId);

  return (
    <Button
      size="lg"
      className={`w-full text-base ${inCart ? "" : "btn-cta"}`}
      variant={inCart ? "outline" : "default"}
      onClick={() => {
        if (!inCart) {
          addItem({
            productId,
            name,
            brand,
            sourceSku,
            color,
            imageUrl,
            productUrl: `/catalog/${productId}`,
          });
          toast.success(`Added "${name}" to inquiry list`);
        } else {
          openInquiryDrawer();
        }
      }}
    >
      {inCart ? (
        <><Check className="w-5 h-5 mr-2" /> In Inquiry List — View List</>
      ) : (
        <><ClipboardList className="w-5 h-5 mr-2" /> Add to Inquiry List</>
      )}
    </Button>
  );
}
