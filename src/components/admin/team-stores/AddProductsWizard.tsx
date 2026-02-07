import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStyles, getProducts, type SSStyle, type SSProduct } from "@/lib/ss-activewear";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Wand2,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Image,
} from "lucide-react";
import { toast } from "sonner";

/* ──────────────────── types ──────────────────── */

interface SelectedProduct {
  ssStyleID: number;
  styleName: string;
  brandName: string;
  title: string;
  styleImage: string | null;
  brandImage: string | null;
  baseCategory: string | null;
  partNumber: string | null;
  // Step 2 fields
  cost: number | null;        // piecePrice from SS API
  suggestedPrice: string;     // calculated from cost × (1 + margin/100)
  priceOverride: string;
  fundraisingEnabled: boolean;
  fundraisingAmount: string;
  // Step 3 fields
  personalizationEnabled: boolean;
  personalizationPrice: string;
}

interface StoreLogo {
  id: string;
  name: string;
  file_url: string;
  method: string;
  placement: string | null;
}

interface Props {
  storeId: string;
  attachedStyleIds: Set<number>;
}

/* ──────────────────── constants ──────────────────── */

const POPULAR_BRANDS = [
  "Gildan", "Next Level", "Bella+Canvas", "Comfort Colors",
  "Nike", "Adidas", "Under Armour", "Champion",
  "Hanes", "Port & Company", "Sport-Tek", "Augusta Sportswear",
];

const PRODUCT_TYPES = [
  { label: "T-Shirts", value: "T-Shirts" },
  { label: "Sweatshirts & Hoodies", value: "Fleece" },
  { label: "Polos", value: "Polos" },
  { label: "Long Sleeve", value: "Long Sleeve" },
  { label: "Tank Tops", value: "Tank Tops" },
  { label: "Hats & Caps", value: "Caps" },
  { label: "Jackets", value: "Outerwear" },
  { label: "Pants & Shorts", value: "Pants" },
  { label: "Youth", value: "Youth" },
  { label: "Ladies", value: "Ladies" },
  { label: "Performance", value: "Performance" },
  { label: "Bags", value: "Bags" },
];

const STEPS = ["Select Products", "Pricing & Fundraising", "Logos & Personalization"] as const;

/* ──────────────────── component ──────────────────── */

export function AddProductsWizard({ storeId, attachedStyleIds }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(false);

  // Step 1 – browse state
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [selected, setSelected] = useState<Map<number, SelectedProduct>>(new Map());

  // Step 2 – bulk actions
  const DEFAULT_MARGIN = 50;
  const [bulkMargin, setBulkMargin] = useState(String(DEFAULT_MARGIN));
  const [bulkFundraisingAmt, setBulkFundraisingAmt] = useState("");

  // Step 3 – logos & personalization
  const [selectedLogoIds, setSelectedLogoIds] = useState<Set<string>>(new Set());
  const [bulkPersonalizationPrice, setBulkPersonalizationPrice] = useState("");

  // Fetch store logos
  const { data: storeLogos = [] } = useQuery<StoreLogo[]>({
    queryKey: ["store-logos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_logos")
        .select("id, name, file_url, method, placement")
        .eq("team_store_id", storeId);
      if (error) throw error;
      return data as StoreLogo[];
    },
    enabled: open,
  });

  /* ── Step 1 helpers ── */

  const handleKeywordChange = useCallback((val: string) => {
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(val), 400);
  }, []);

  const hasFilters = !!(selectedBrand || selectedType || debouncedKeyword.length >= 2);

  const { data: rawResults = [] as SSStyle[], isFetching: searching } = useQuery<SSStyle[]>({
    queryKey: ["wizard-browse", selectedBrand, selectedType, debouncedKeyword],
    queryFn: async (): Promise<SSStyle[]> => {
      if (!hasFilters) return [];
      if (selectedBrand || selectedType) {
        const params: { brand?: string; category?: string } = {};
        if (selectedBrand) params.brand = selectedBrand;
        if (selectedType) params.category = selectedType;
        return await getStyles(params);
      }
      return await getStyles();
    },
    enabled: !!hasFilters && open && step === 0,
    staleTime: 120_000,
  });

  const searchResults = useMemo(() => {
    let filtered = rawResults;
    if (debouncedKeyword && debouncedKeyword.length >= 2) {
      const q = debouncedKeyword.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.styleName?.toLowerCase().includes(q) ||
          s.brandName?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          String(s.styleID) === debouncedKeyword
      );
    }
    return filtered.slice(0, 60);
  }, [rawResults, debouncedKeyword]);

  const toggleProduct = (s: SSStyle) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(s.styleID)) {
        next.delete(s.styleID);
      } else {
        next.set(s.styleID, {
          ssStyleID: s.styleID,
          styleName: s.styleName,
          brandName: s.brandName,
          title: s.title,
          styleImage: s.styleImage || null,
          brandImage: s.brandImage || null,
          baseCategory: s.baseCategory || null,
          partNumber: s.partNumber || null,
          cost: null,
          suggestedPrice: "",
          priceOverride: "",
          fundraisingEnabled: true,
          fundraisingAmount: "",
          personalizationEnabled: false,
          personalizationPrice: "",
        });
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedType("");
    setKeyword("");
    setDebouncedKeyword("");
  };

  /* ── Cost fetching when entering Step 2 ── */

  const fetchCostsForSelected = useCallback(async () => {
    const needsCost = Array.from(selected.values()).filter((p) => p.cost === null);
    if (needsCost.length === 0) return;
    setLoadingCosts(true);
    try {
      // Fetch products in batches by style to get piecePrice
      const updates = new Map<number, { cost: number; suggestedPrice: string; priceOverride: string }>();
      const margin = parseFloat(bulkMargin) || DEFAULT_MARGIN;

      for (const p of needsCost) {
        try {
          const products = await getProducts({ style: p.ssStyleID });
          // Use the lowest piecePrice as cost
          const prices = products.map((pr) => pr.piecePrice).filter((v): v is number => v != null && v > 0);
          const cost = prices.length > 0 ? Math.min(...prices) : 0;
          const suggested = cost > 0 ? (cost * (1 + margin / 100)).toFixed(2) : "";
          updates.set(p.ssStyleID, { cost, suggestedPrice: suggested, priceOverride: suggested });
        } catch {
          updates.set(p.ssStyleID, { cost: 0, suggestedPrice: "", priceOverride: "" });
        }
      }

      setSelected((prev) => {
        const next = new Map(prev);
        for (const [id, u] of updates) {
          const existing = next.get(id);
          if (existing) next.set(id, { ...existing, ...u });
        }
        return next;
      });
    } finally {
      setLoadingCosts(false);
    }
  }, [selected, bulkMargin]);

  /* ── Step 2 bulk actions ── */

  const applyBulkMargin = () => {
    const pct = parseFloat(bulkMargin);
    if (isNaN(pct) || pct <= 0) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v.cost && v.cost > 0) {
          const suggested = (v.cost * (1 + pct / 100)).toFixed(2);
          next.set(k, { ...v, suggestedPrice: suggested, priceOverride: suggested });
        }
      }
      return next;
    });
    toast.success(`Applied ${pct}% margin to all products with cost data`);
  };

  const applyBulkFundraising = () => {
    const amt = parseFloat(bulkFundraisingAmt);
    if (isNaN(amt) || amt < 0) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        next.set(k, { ...v, fundraisingAmount: String(amt), fundraisingEnabled: true });
      }
      return next;
    });
    toast.success(`Set $${amt} fundraising for all ${selected.size} products`);
  };

  /* ── Step 3 bulk personalization ── */

  const applyBulkPersonalization = () => {
    const price = parseFloat(bulkPersonalizationPrice);
    if (isNaN(price) || price < 0) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        next.set(k, { ...v, personalizationEnabled: true, personalizationPrice: String(price) });
      }
      return next;
    });
    toast.success(`Personalization enabled at $${price} for all products`);
  };

  const toggleLogo = (id: string) => {
    setSelectedLogoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Finish ── */

  const handleFinish = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const products = Array.from(selected.values());

      // 1. Ensure all styles exist in catalog_styles, get their DB ids
      const catalogIdMap = new Map<number, number>(); // ssStyleID → catalog_styles.id

      for (const p of products) {
        const { data: existing } = await supabase
          .from("catalog_styles")
          .select("id")
          .eq("style_id", p.ssStyleID)
          .maybeSingle();

        if (existing) {
          catalogIdMap.set(p.ssStyleID, existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from("catalog_styles")
            .insert({
              style_id: p.ssStyleID,
              style_name: p.styleName,
              brand_name: p.brandName,
              title: p.title,
              style_image: p.styleImage,
              brand_image: p.brandImage,
              base_category: p.baseCategory,
              part_number: p.partNumber,
              is_active: true,
            })
            .select("id")
            .single();
          if (error) throw error;
          catalogIdMap.set(p.ssStyleID, inserted.id);
        }
      }

      // 2. Bulk insert team_store_products
      const rows = products.map((p, i) => ({
        team_store_id: storeId,
        style_id: catalogIdMap.get(p.ssStyleID)!,
        sort_order: i,
        price_override: p.priceOverride ? parseFloat(p.priceOverride) : null,
        fundraising_enabled: p.fundraisingEnabled,
        fundraising_amount_per_unit: p.fundraisingAmount ? parseFloat(p.fundraisingAmount) : null,
        personalization_enabled: p.personalizationEnabled,
        personalization_price: p.personalizationPrice ? parseFloat(p.personalizationPrice) : null,
      }));

      const { data: insertedProducts, error: insertErr } = await supabase
        .from("team_store_products")
        .insert(rows)
        .select("id, style_id");
      if (insertErr) throw insertErr;

      // 3. Bulk insert logo assignments
      if (selectedLogoIds.size > 0 && insertedProducts) {
        const logoRows = insertedProducts.flatMap((item) =>
          Array.from(selectedLogoIds).map((logoId) => ({
            team_store_item_id: item.id,
            store_logo_id: logoId,
          }))
        );
        const { error: logoErr } = await supabase.from("team_store_item_logos").insert(logoRows);
        if (logoErr) throw logoErr;
      }

      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success(`Added ${products.length} products to the store`);
      resetAndClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save products");
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep(0);
    setSelected(new Map());
    setSelectedLogoIds(new Set());
    setBulkMargin(String(DEFAULT_MARGIN));
    setBulkFundraisingAmt("");
    setBulkPersonalizationPrice("");
    clearFilters();
  };

  const updateProduct = (id: number, updates: Partial<SelectedProduct>) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, ...updates });
      return next;
    });
  };

  const selectedArr = Array.from(selected.values());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wand2 className="w-4 h-4 mr-1" /> Add Products (Wizard)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header with step indicator */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Add Products — Step {step + 1} of 3</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step
                      ? "bg-accent text-accent-foreground"
                      : i === step
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 0 && <Step1Browse
            hasFilters={hasFilters}
            searching={searching}
            searchResults={searchResults}
            rawResults={rawResults}
            selected={selected}
            attachedStyleIds={attachedStyleIds}
            toggleProduct={toggleProduct}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            keyword={keyword}
            handleKeywordChange={handleKeywordChange}
            debouncedKeyword={debouncedKeyword}
            setKeyword={setKeyword}
            setDebouncedKeyword={setDebouncedKeyword}
            clearFilters={clearFilters}
          />}

          {step === 1 && <Step2Pricing
            products={selectedArr}
            updateProduct={updateProduct}
            bulkMargin={bulkMargin}
            setBulkMargin={setBulkMargin}
            applyBulkMargin={applyBulkMargin}
            bulkFundraisingAmt={bulkFundraisingAmt}
            setBulkFundraisingAmt={setBulkFundraisingAmt}
            applyBulkFundraising={applyBulkFundraising}
            loadingCosts={loadingCosts}
            fetchCosts={fetchCostsForSelected}
          />}

          {step === 2 && <Step3Logos
            products={selectedArr}
            updateProduct={updateProduct}
            storeLogos={storeLogos}
            selectedLogoIds={selectedLogoIds}
            toggleLogo={toggleLogo}
            bulkPersonalizationPrice={bulkPersonalizationPrice}
            setBulkPersonalizationPrice={setBulkPersonalizationPrice}
            applyBulkPersonalization={applyBulkPersonalization}
          />}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selected.size} product{selected.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 2 ? (
              <Button
                size="sm"
                className="btn-cta"
                disabled={selected.size === 0}
                onClick={() => setStep((s) => s + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="btn-cta"
                disabled={selected.size === 0 || saving}
                onClick={handleFinish}
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : `Add ${selected.size} Products`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════ Step 1 ═══════════════════ */

function Step1Browse({
  hasFilters, searching, searchResults, rawResults, selected, attachedStyleIds,
  toggleProduct, selectedBrand, setSelectedBrand, selectedType, setSelectedType,
  keyword, handleKeywordChange, debouncedKeyword, setKeyword, setDebouncedKeyword, clearFilters,
}: {
  hasFilters: boolean;
  searching: boolean;
  searchResults: SSStyle[];
  rawResults: SSStyle[];
  selected: Map<number, SelectedProduct>;
  attachedStyleIds: Set<number>;
  toggleProduct: (s: SSStyle) => void;
  selectedBrand: string;
  setSelectedBrand: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  keyword: string;
  handleKeywordChange: (v: string) => void;
  debouncedKeyword: string;
  setKeyword: (v: string) => void;
  setDebouncedKeyword: (v: string) => void;
  clearFilters: () => void;
}) {
  return (
    <>
      {/* Selected count badge */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b">
          {Array.from(selected.values()).map((p) => (
            <Badge key={p.ssStyleID} variant="secondary" className="text-xs gap-1 pr-1">
              {p.styleName}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleProduct({ styleID: p.ssStyleID } as SSStyle)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Brand</Label>
          <Select value={selectedBrand || "__all__"} onValueChange={(v) => setSelectedBrand(v === "__all__" ? "" : v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="All brands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Brands</SelectItem>
              {POPULAR_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Product Type</Label>
          <Select value={selectedType || "__all__"} onValueChange={(v) => setSelectedType(v === "__all__" ? "" : v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => handleKeywordChange(e.target.value)} placeholder="Search by name, style ID, or keyword…" className="pl-9 text-sm" />
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedBrand && (
            <Badge variant="secondary" className="text-xs gap-1">
              {selectedBrand} <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand("")} />
            </Badge>
          )}
          {selectedType && (
            <Badge variant="secondary" className="text-xs gap-1">
              {PRODUCT_TYPES.find((t) => t.value === selectedType)?.label || selectedType}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType("")} />
            </Badge>
          )}
          {debouncedKeyword && (
            <Badge variant="secondary" className="text-xs gap-1">
              "{debouncedKeyword}" <X className="w-3 h-3 cursor-pointer" onClick={() => { setKeyword(""); setDebouncedKeyword(""); }} />
            </Badge>
          )}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">Clear all</button>
        </div>
      )}

      {/* Results with checkboxes */}
      {hasFilters ? (
        <div className="border rounded-md overflow-hidden">
          {searching ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching products…
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No products found.</p>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  {rawResults.length > 60 ? ` (showing first 60)` : ""}
                </p>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                {searchResults.map((s) => {
                  const isSelected = selected.has(s.styleID);
                  const isAttached = attachedStyleIds.has(s.styleID);
                  return (
                    <label
                      key={s.styleID}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-accent/10" : "hover:bg-muted/50"
                      } ${isAttached ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isAttached}
                        onCheckedChange={() => toggleProduct(s)}
                        className="shrink-0"
                      />
                      {s.styleImage ? (
                        <img src={s.styleImage} alt="" className="w-10 h-10 object-contain rounded border bg-white shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-muted-foreground">N/A</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.title || s.styleName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.brandName} · #{s.styleID}{s.partNumber ? ` · ${s.partNumber}` : ""}
                        </p>
                      </div>
                      {isAttached && <Badge variant="secondary" className="text-[10px] shrink-0">Already added</Badge>}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Select a brand, product type, or search to browse products</p>
        </div>
      )}
    </>
  );
}

/* ═══════════════════ Step 2 ═══════════════════ */

function Step2Pricing({
  products, updateProduct,
  bulkMargin, setBulkMargin, applyBulkMargin,
  bulkFundraisingAmt, setBulkFundraisingAmt, applyBulkFundraising,
  loadingCosts, fetchCosts,
}: {
  products: SelectedProduct[];
  updateProduct: (id: number, u: Partial<SelectedProduct>) => void;
  bulkMargin: string;
  setBulkMargin: (v: string) => void;
  applyBulkMargin: () => void;
  bulkFundraisingAmt: string;
  setBulkFundraisingAmt: (v: string) => void;
  applyBulkFundraising: () => void;
  loadingCosts: boolean;
  fetchCosts: () => Promise<void>;
}) {
  // Fetch costs on mount
  useEffect(() => {
    fetchCosts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {loadingCosts && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Fetching product costs…
        </div>
      )}

      {/* Bulk actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-muted/30 border">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Margin % (applied to cost)</Label>
          <div className="flex gap-2">
            <Input type="number" value={bulkMargin} onChange={(e) => setBulkMargin(e.target.value)} placeholder="e.g. 50" className="text-sm" />
            <Button size="sm" variant="outline" onClick={applyBulkMargin} disabled={!bulkMargin || loadingCosts}>Apply</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Sale Price = Cost × (1 + margin/100)</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Fundraising $ per unit for all</Label>
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={bulkFundraisingAmt} onChange={(e) => setBulkFundraisingAmt(e.target.value)} placeholder="e.g. 5.00" className="text-sm" />
            <Button size="sm" variant="outline" onClick={applyBulkFundraising} disabled={!bulkFundraisingAmt}>Apply</Button>
          </div>
        </div>
      </div>

      {/* Per-product table */}
      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_90px_100px_70px_90px] gap-2 px-3 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
          <span>Product</span>
          <span>Cost</span>
          <span>Suggested</span>
          <span>Sale Price</span>
          <span>Fund?</span>
          <span>$/Unit</span>
        </div>
        <div className="max-h-[40vh] overflow-y-auto divide-y">
          {products.map((p) => (
            <div key={p.ssStyleID} className="grid grid-cols-[1fr_80px_90px_100px_70px_90px] gap-2 px-3 py-2 items-center">
              <div className="flex items-center gap-2 min-w-0">
                {p.styleImage && <img src={p.styleImage} alt="" className="w-8 h-8 object-contain rounded shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.styleName}</p>
                  <p className="text-xs text-muted-foreground">{p.brandName}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {p.cost != null && p.cost > 0 ? `$${p.cost.toFixed(2)}` : loadingCosts ? "…" : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.suggestedPrice ? `$${parseFloat(p.suggestedPrice).toFixed(2)}` : "—"}
              </span>
              <Input
                type="number"
                step="0.01"
                value={p.priceOverride}
                onChange={(e) => updateProduct(p.ssStyleID, { priceOverride: e.target.value })}
                placeholder="—"
                className="text-xs h-8"
              />
              <div className="flex items-center justify-center">
                <Switch
                  checked={p.fundraisingEnabled}
                  onCheckedChange={(v) => updateProduct(p.ssStyleID, { fundraisingEnabled: v })}
                />
              </div>
              <Input
                type="number"
                step="0.01"
                value={p.fundraisingAmount}
                onChange={(e) => updateProduct(p.ssStyleID, { fundraisingAmount: e.target.value })}
                placeholder="—"
                className="text-xs h-8"
                disabled={!p.fundraisingEnabled}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════ Step 3 ═══════════════════ */

function Step3Logos({
  products, updateProduct, storeLogos, selectedLogoIds, toggleLogo,
  bulkPersonalizationPrice, setBulkPersonalizationPrice, applyBulkPersonalization,
}: {
  products: SelectedProduct[];
  updateProduct: (id: number, u: Partial<SelectedProduct>) => void;
  storeLogos: StoreLogo[];
  selectedLogoIds: Set<string>;
  toggleLogo: (id: string) => void;
  bulkPersonalizationPrice: string;
  setBulkPersonalizationPrice: (v: string) => void;
  applyBulkPersonalization: () => void;
}) {
  return (
    <>
      {/* Logo selection */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Logos to apply to all products</Label>
        {storeLogos.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/20">
            No logos uploaded for this store yet. You can add logos from the Logos tab.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {storeLogos.map((logo) => (
              <label
                key={logo.id}
                className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedLogoIds.has(logo.id) ? "border-accent bg-accent/5" : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={selectedLogoIds.has(logo.id)}
                  onCheckedChange={() => toggleLogo(logo.id)}
                />
                <img src={logo.file_url} alt={logo.name} className="w-10 h-10 object-contain rounded bg-white border" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{logo.name}</p>
                  <p className="text-xs text-muted-foreground">{logo.method} · {logo.placement || "default"}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Personalization */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-sm font-semibold">Personalization</Label>
        <div className="p-3 rounded-md bg-muted/30 border space-y-2">
          <Label className="text-xs font-medium">Apply personalization price to all</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={bulkPersonalizationPrice}
              onChange={(e) => setBulkPersonalizationPrice(e.target.value)}
              placeholder="e.g. 10.00"
              className="text-sm max-w-[200px]"
            />
            <Button size="sm" variant="outline" onClick={applyBulkPersonalization} disabled={!bulkPersonalizationPrice}>
              Apply to All
            </Button>
          </div>
        </div>

        {/* Per-product personalization */}
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px] gap-2 px-3 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
            <span>Product</span>
            <span>Enabled</span>
            <span>Price</span>
          </div>
          <div className="max-h-[30vh] overflow-y-auto divide-y">
            {products.map((p) => (
              <div key={p.ssStyleID} className="grid grid-cols-[1fr_80px_100px] gap-2 px-3 py-2 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  {p.styleImage && <img src={p.styleImage} alt="" className="w-7 h-7 object-contain rounded shrink-0" />}
                  <p className="text-sm truncate">{p.styleName}</p>
                </div>
                <div className="flex items-center justify-center">
                  <Switch
                    checked={p.personalizationEnabled}
                    onCheckedChange={(v) => updateProduct(p.ssStyleID, { personalizationEnabled: v })}
                  />
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={p.personalizationPrice}
                  onChange={(e) => updateProduct(p.ssStyleID, { personalizationPrice: e.target.value })}
                  placeholder="—"
                  className="text-xs h-8"
                  disabled={!p.personalizationEnabled}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
