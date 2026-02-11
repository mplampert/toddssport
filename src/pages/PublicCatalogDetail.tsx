import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Package, Share2, Send, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProducts, getStyles, type SSProduct, type SSStyle } from "@/lib/ss-activewear";
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

const DECORATION_TYPES = [
  "Screen Print",
  "Embroidery",
  "DTF (Direct to Film)",
  "Heat Transfer",
  "Not Sure / Need Guidance",
];

export default function PublicCatalogDetail() {
  const { styleId } = useParams<{ styleId: string }>();

  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formDecoration, setFormDecoration] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Fetch catalog style info from our DB
  const { data: catalogStyle, isLoading: loadingCatalog } = useQuery({
    queryKey: ["public-catalog-style", styleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_styles")
        .select("*")
        .eq("style_id", Number(styleId))
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!styleId,
  });

  // Fetch color/size data from S&S via edge function
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["public-catalog-products", styleId],
    queryFn: async () => {
      try {
        const data = await getProducts({ style: styleId });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!styleId,
  });

  // Fetch style details from S&S
  const { data: ssStyleInfo } = useQuery({
    queryKey: ["public-catalog-ss-style", styleId],
    queryFn: async () => {
      try {
        const data = await getStyles({ style: styleId });
        const styles = Array.isArray(data) ? data : [];
        return styles.find((s) => String(s.styleID) === styleId) || null;
      } catch {
        return null;
      }
    },
    enabled: !!styleId,
  });

  // Fetch specs
  const { data: specs = [] } = useQuery({
    queryKey: ["public-catalog-specs", styleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_specs")
        .select("spec_name, value")
        .eq("style_id", Number(styleId))
        .not("value", "is", null);
      if (error) throw error;
      // Dedupe by spec_name
      const map = new Map<string, string>();
      (data || []).forEach((s) => {
        if (s.value && !map.has(s.spec_name)) map.set(s.spec_name, s.value);
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
    enabled: !!styleId,
  });

  // Pre-select first color
  useEffect(() => {
    if (products.length > 0 && !selectedColor) {
      setSelectedColor(products[0].colorName);
    }
  }, [products, selectedColor]);

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
          swatchImage: p.colorSwatchImage,
          color1: p.color1,
          color2: p.color2,
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

  // Size range
  const sizeRange = useMemo(() => {
    const sizes = products
      .filter((p) => p.sizeName)
      .map((p) => p.sizeName)
      .filter((v, i, a) => a.indexOf(v) === i);
    return sizes;
  }, [products]);

  const productName = catalogStyle?.title || catalogStyle?.style_name || ssStyleInfo?.title || ssStyleInfo?.styleName || `Style #${styleId}`;
  const brandName = catalogStyle?.brand_name || products[0]?.brandName || "";
  const partNumber = catalogStyle?.part_number || ssStyleInfo?.partNumber || "";
  const description = catalogStyle?.description || ssStyleInfo?.description || "";

  // Submit inquiry
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        email: formEmail,
        organization: formOrg || null,
        phone: formPhone || null,
        product_style_id: Number(styleId),
        product_brand: brandName,
        product_style_code: partNumber,
        product_name: productName,
        product_color: selectedColor || null,
        quantity_estimate: formQty || null,
        decoration_type: formDecoration || null,
        notes: formNotes || null,
      };

      const { error } = await supabase.from("product_inquiries").insert(payload);
      if (error) throw error;

      // Fire-and-forget GHL webhook
      supabase.functions.invoke("notify-product-inquiry", {
        body: payload,
      }).catch((err) => console.warn("GHL webhook failed:", err));
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Inquiry submitted! We'll be in touch soon.");
    },
    onError: (err) => {
      toast.error("Failed to submit inquiry. Please try again.");
      console.error("Inquiry submit error:", err);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    submitMutation.mutate();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Product link copied to clipboard!");
    }).catch(() => {
      toast.error("Could not copy link.");
    });
  };

  const isLoading = loadingCatalog || loadingProducts;

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
                  <Dialog open={inquiryOpen} onOpenChange={(open) => { setInquiryOpen(open); if (!open) setSubmitted(false); }}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full btn-cta text-base">
                        <Send className="w-5 h-5 mr-2" />
                        Request This Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Request: {productName}</DialogTitle>
                        <DialogDescription>
                          Fill out the form below and we'll get back to you with pricing and options.
                        </DialogDescription>
                      </DialogHeader>

                      {submitted ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-accent" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Inquiry Submitted!</h3>
                          <p className="text-muted-foreground text-sm">
                            We'll review your request and get back to you shortly.
                          </p>
                          <Button variant="outline" className="mt-4" onClick={() => setInquiryOpen(false)}>
                            Close
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="inq-name">Name *</Label>
                              <Input id="inq-name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                            </div>
                            <div>
                              <Label htmlFor="inq-email">Email *</Label>
                              <Input id="inq-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="inq-org">Organization / Team</Label>
                              <Input id="inq-org" value={formOrg} onChange={(e) => setFormOrg(e.target.value)} />
                            </div>
                            <div>
                              <Label htmlFor="inq-phone">Phone</Label>
                              <Input id="inq-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="inq-qty">Quantity Estimate</Label>
                              <Input id="inq-qty" placeholder="e.g. 25-50" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
                            </div>
                            <div>
                              <Label htmlFor="inq-dec">Decoration Type</Label>
                              <Select value={formDecoration} onValueChange={setFormDecoration}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DECORATION_TYPES.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="inq-notes">Notes</Label>
                            <Textarea
                              id="inq-notes"
                              placeholder="Tell us more about your project…"
                              value={formNotes}
                              onChange={(e) => setFormNotes(e.target.value)}
                              rows={3}
                            />
                          </div>

                          {/* Hidden context shown as summary */}
                          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
                            <strong>Product:</strong> {productName} · <strong>Brand:</strong> {brandName} · <strong>Style:</strong> #{partNumber}
                            {selectedColor && <> · <strong>Color:</strong> {selectedColor}</>}
                          </div>

                          <Button type="submit" className="w-full btn-cta" disabled={submitMutation.isPending}>
                            {submitMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                            ) : (
                              <><Send className="w-4 h-4 mr-2" /> Submit Inquiry</>
                            )}
                          </Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>

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
