import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

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
  storeId: string;
  attachedStyleIds: Set<number>;
}

export function AddProductBrowser({ storeId, attachedStyleIds }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleKeywordChange = useCallback((val: string) => {
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(val), 400);
  }, []);

  const hasFilters = selectedBrand || selectedType || debouncedKeyword.length >= 2;

  const { data: rawResults = [] as SSStyle[], isFetching: searching } = useQuery<SSStyle[]>({
    queryKey: ["add-product-browse-all"],
    queryFn: async (): Promise<SSStyle[]> => {
      return await getStyles();
    },
    enabled: !!hasFilters && open,
    staleTime: 300_000,
  });

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

  const addProduct = async (style: SSStyle) => {
    setAddingIds((prev) => new Set(prev).add(style.styleID));
    try {
      // Upsert into catalog_styles so we have a local record
      const { data: existing } = await supabase
        .from("catalog_styles")
        .select("id")
        .eq("style_id", style.styleID)
        .maybeSingle();

      let catalogId: number;
      if (existing) {
        catalogId = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("catalog_styles")
          .insert({
            style_id: style.styleID,
            style_name: style.styleName,
            brand_name: style.brandName,
            title: style.title,
            style_image: style.styleImage || null,
            brand_image: style.brandImage || null,
            base_category: style.baseCategory || null,
            part_number: style.partNumber || null,
            is_active: true,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        catalogId = inserted.id;
      }

      // Check if already attached
      if (attachedStyleIds.has(catalogId)) {
        toast.info("Product already in store");
        return;
      }

      // Attach to team store
      const { error } = await supabase.from("team_store_products").insert({
        team_store_id: storeId,
        style_id: catalogId,
        sort_order: 0,
      });
      if (error) throw error;

      setAddedIds((prev) => new Set(prev).add(style.styleID));
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success(`Added ${style.styleName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add product");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(style.styleID);
        return next;
      });
    }
  };

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedType("");
    setKeyword("");
    setDebouncedKeyword("");
  };

  const isAdded = (styleID: number) => addedIds.has(styleID) || attachedStyleIds.has(styleID);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setAddedIds(new Set());
          clearFilters();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="btn-cta">
          <Plus className="w-4 h-4 mr-1" /> Add Products
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse & Add Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Brand</Label>
              <Select
                value={selectedBrand || "__all__"}
                onValueChange={(v) => setSelectedBrand(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Brands</SelectItem>
                  {POPULAR_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Type</Label>
              <Select
                value={selectedType || "__all__"}
                onValueChange={(v) => setSelectedType(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Search by name, style ID, or keyword…"
              className="pl-9 text-sm"
            />
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedBrand && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {selectedBrand}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand("")} />
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
                  "{debouncedKeyword}"
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => {
                      setKeyword("");
                      setDebouncedKeyword("");
                    }}
                  />
                </Badge>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results */}
          {hasFilters ? (
            <div className="border rounded-md overflow-hidden">
              {searching ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching products…
                </div>
              ) : searchResults.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  No products found. Try adjusting your filters.
                </p>
              ) : (
                <>
                  <div className="px-3 py-1.5 border-b bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                      {rawResults.length > 50 ? ` (showing first 50 of ${rawResults.length})` : ""}
                    </p>
                  </div>
                  <div className="max-h-[40vh] overflow-y-auto divide-y">
                    {searchResults.map((s) => (
                      <div
                        key={s.styleID}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {s.styleImage ? (
                            <img
                              src={s.styleImage}
                              alt=""
                              className="w-10 h-10 object-contain rounded border bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-muted-foreground">N/A</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {s.title || s.styleName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.brandName} · #{s.styleID}
                              {s.partNumber ? ` · ${s.partNumber}` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded(s.styleID) ? "ghost" : "outline"}
                          disabled={isAdded(s.styleID) || addingIds.has(s.styleID)}
                          onClick={() => addProduct(s)}
                          className="shrink-0 ml-2"
                        >
                          {addingIds.has(s.styleID) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isAdded(s.styleID) ? (
                            <>
                              <Check className="w-3 h-3 mr-1" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" /> Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md bg-muted/20">
              <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a brand, product type, or enter a search term to browse products
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
