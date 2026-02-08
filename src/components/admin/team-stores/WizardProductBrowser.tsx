import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, X, Loader2 } from "lucide-react";

interface SelectedProduct {
  styleId: number;
  styleName: string;
  brandName: string;
  styleImage: string | null;
  priceOverride: string;
  notes: string;
}

// Popular brands for quick access
const POPULAR_BRANDS = [
  "Gildan",
  "Next Level",
  "Bella+Canvas",
  "Comfort Colors",
  "Nike",
  "Adidas",
  "Under Armour",
  "Champion",
  "Hanes",
  "Port & Company",
  "Sport-Tek",
  "Augusta Sportswear",
];

// Common product types for quick filtering
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

interface Props {
  selectedProducts: SelectedProduct[];
  selectedStyleIds: Set<number>;
  addProduct: (s: SSStyle) => void;
  removeProduct: (id: number) => void;
  updateProduct: (id: number, field: "priceOverride" | "notes", value: string) => void;
}

export function WizardProductBrowser({
  selectedProducts,
  selectedStyleIds,
  addProduct,
  removeProduct,
  updateProduct,
}: Props) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleKeywordChange = useCallback((val: string) => {
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(val), 400);
  }, []);

  // Determine if we have enough filters to search
  const hasFilters = selectedBrand || selectedType || debouncedKeyword.length >= 2;

  // Build query params for S&S API
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedBrand) params.brand = selectedBrand;
    if (selectedType) params.category = selectedType;
    if (debouncedKeyword && !selectedBrand && !selectedType) {
      // If only keyword, try as style search
      params.style = debouncedKeyword;
    }
    return params;
  }, [selectedBrand, selectedType, debouncedKeyword]);

  const { data: rawResults = [] as SSStyle[], isFetching: searching } = useQuery<SSStyle[]>({
    queryKey: ["wizard-product-browse-all"],
    queryFn: async (): Promise<SSStyle[]> => {
      // S&S API doesn't support brand/category query params reliably
      // Fetch all styles once and filter client-side (same approach as catalog pages)
      return await getStyles();
    },
    enabled: !!hasFilters,
    staleTime: 300_000, // cache for 5 min since this is the full catalog
  });

  // All filtering happens client-side
  const searchResults = useMemo(() => {
    let filtered = rawResults;
    if (selectedBrand) {
      filtered = filtered.filter(
        (s) => s.brandName?.toLowerCase() === selectedBrand.toLowerCase()
      );
    }
    if (selectedType) {
      filtered = filtered.filter(
        (s) => s.baseCategory?.toLowerCase() === selectedType.toLowerCase()
      );
    }
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
    return filtered.slice(0, 50);
  }, [rawResults, debouncedKeyword, selectedBrand, selectedType]);

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedType("");
    setKeyword("");
    setDebouncedKeyword("");
  };

  return (
    <>
      {/* Filter controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Brand</Label>
            <Select value={selectedBrand || "__all__"} onValueChange={(v) => setSelectedBrand(v === "__all__" ? "" : v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Brands</SelectItem>
                {POPULAR_BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Product Type</Label>
            <Select value={selectedType || "__all__"} onValueChange={(v) => setSelectedType(v === "__all__" ? "" : v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Search by name, style ID, or keyword (e.g. sweatshirt)…"
              className="pl-9 text-sm"
            />
          </div>
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedBrand && (
              <Badge variant="secondary" className="text-xs gap-1">
                Brand: {selectedBrand}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand("")} />
              </Badge>
            )}
            {selectedType && (
              <Badge variant="secondary" className="text-xs gap-1">
                Type: {PRODUCT_TYPES.find(t => t.value === selectedType)?.label || selectedType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType("")} />
              </Badge>
            )}
            {debouncedKeyword && (
              <Badge variant="secondary" className="text-xs gap-1">
                "{debouncedKeyword}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => { setKeyword(""); setDebouncedKeyword(""); }} />
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {hasFilters && (
        <div className="border rounded-md max-h-64 overflow-y-auto">
          {searching ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching products…
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No products found. Try adjusting your filters.
            </p>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b bg-muted/30">
                <p className="text-xs text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
              </div>
              {searchResults.map((s) => (
                <div
                  key={s.styleID}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {s.styleImage ? (
                      <img src={s.styleImage} alt="" className="w-10 h-10 object-contain rounded border bg-white shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs text-muted-foreground">N/A</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.title || s.styleName}</p>
                      <p className="text-xs text-muted-foreground">{s.brandName} · #{s.styleID}{s.partNumber ? ` · ${s.partNumber}` : ""}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedStyleIds.has(s.styleID)}
                    onClick={() => addProduct(s)}
                    className="shrink-0 ml-2"
                  >
                    {selectedStyleIds.has(s.styleID) ? "Added" : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!hasFilters && (
        <div className="text-center py-6 border rounded-md bg-muted/20">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a brand, product type, or enter a search term to browse products
          </p>
        </div>
      )}

      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="text-sm font-semibold">
            Selected Products ({selectedProducts.length})
          </Label>
          {selectedProducts.map((p) => (
            <div key={p.styleId} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                {p.styleImage ? (
                  <img src={p.styleImage} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.styleName}</p>
                  <p className="text-xs text-muted-foreground">{p.brandName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeProduct(p.styleId)} className="shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedProducts.length === 0 && hasFilters && (
        <p className="text-sm text-muted-foreground">
          No products selected yet. Browse above and click Add.
        </p>
      )}
    </>
  );
}
