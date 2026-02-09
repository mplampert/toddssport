import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";

interface StoreProduct {
  id: string;
  display_name: string | null;
  price_override: number | null;
  style_id: number;
  allowed_colors: any;
  catalog_styles: { style_name: string; style_image: string | null; style_id: number; title?: string | null; brand_name?: string } | null;
}

interface LineItemPayload {
  team_store_product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  variant_snapshot: { size?: string; color?: string; colorCode?: string; sku?: string };
  personalization_name: string | null;
  personalization_number: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeProducts: StoreProduct[];
  onAdd: (payload: LineItemPayload) => Promise<void>;
  isPending: boolean;
}

interface ColorOption {
  code: string;
  name: string;
  sizes: SizeOption[];
}

interface SizeOption {
  name: string;
  sku: string;
  piecePrice?: number;
}

const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

function sortSizes(sizes: SizeOption[]): SizeOption[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.name);
    const bi = SIZE_ORDER.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function AddLineItemDialog({ open, onOpenChange, storeProducts, onAdd, isPending }: Props) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [personalizationName, setPersonalizationName] = useState("");
  const [personalizationNumber, setPersonalizationNumber] = useState("");

  // Variant loading state
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [allColorOptions, setAllColorOptions] = useState<ColorOption[]>([]);
  const [variantError, setVariantError] = useState<string | null>(null);

  const selectedProduct = storeProducts.find((p) => p.id === selectedProductId);

  // Derive filtered colors/sizes based on allowed_colors
  const filteredColors = useMemo(() => {
    if (!selectedProduct) return [];
    const allowed = selectedProduct.allowed_colors;

    if (!Array.isArray(allowed) || allowed.length === 0) {
      // No filter — all colors available
      return allColorOptions;
    }

    // Filter to only allowed colors, and remove excluded sizes
    return allColorOptions
      .filter((c) => allowed.some((a: any) => a.code === c.code))
      .map((c) => {
        const allowedEntry = allowed.find((a: any) => a.code === c.code);
        const excludedSizes: string[] = allowedEntry?.excludedSizes || [];
        return {
          ...c,
          sizes: c.sizes.filter((s) => !excludedSizes.includes(s.name)),
        };
      })
      .filter((c) => c.sizes.length > 0); // Remove colors with no enabled sizes
  }, [allColorOptions, selectedProduct]);

  const hasColors = filteredColors.length > 0;

  const selectedColorObj = filteredColors.find((c) => c.code === selectedColor);
  const availableSizes = useMemo(() => {
    if (!selectedColorObj) return [];
    return sortSizes(selectedColorObj.sizes);
  }, [selectedColorObj]);

  const hasSizes = availableSizes.length > 0;

  // When product changes, fetch variants
  useEffect(() => {
    if (!selectedProduct) {
      setAllColorOptions([]);
      setSelectedColor("");
      setSelectedSize("");
      return;
    }

    let cancelled = false;
    async function fetchVariants() {
      setVariantsLoading(true);
      setVariantError(null);
      setAllColorOptions([]);
      setSelectedColor("");
      setSelectedSize("");

      try {
        const ssStyleId = selectedProduct!.catalog_styles?.style_id ?? selectedProduct!.style_id;
        const products = await getProducts({ style: ssStyleId });
        if (cancelled) return;

        const colorMap = new Map<string, ColorOption>();
        products.forEach((sp: SSProduct) => {
          if (!sp.colorName) return;
          const existing = colorMap.get(sp.colorCode);
          if (existing) {
            existing.sizes.push({
              name: sp.sizeName,
              sku: sp.sku || "",
              piecePrice: sp.piecePrice,
            });
          } else {
            colorMap.set(sp.colorCode, {
              code: sp.colorCode,
              name: sp.colorName,
              sizes: [{ name: sp.sizeName, sku: sp.sku || "", piecePrice: sp.piecePrice }],
            });
          }
        });

        const options = Array.from(colorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setAllColorOptions(options);
      } catch (e: any) {
        if (!cancelled) setVariantError(e.message || "Failed to load variants");
      } finally {
        if (!cancelled) setVariantsLoading(false);
      }
    }

    fetchVariants();
    return () => { cancelled = true; };
  }, [selectedProduct?.id, selectedProduct?.style_id]);

  // Auto-select single color
  useEffect(() => {
    if (filteredColors.length === 1 && !selectedColor) {
      setSelectedColor(filteredColors[0].code);
    }
  }, [filteredColors, selectedColor]);

  // Auto-select single size
  useEffect(() => {
    if (availableSizes.length === 1 && !selectedSize) {
      setSelectedSize(availableSizes[0].name);
    }
  }, [availableSizes, selectedSize]);

  // Set default price when product selected
  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(Number(selectedProduct.price_override) || 0);
    }
  }, [selectedProduct]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedProductId("");
      setSelectedColor("");
      setSelectedSize("");
      setQuantity(1);
      setUnitPrice(0);
      setPersonalizationName("");
      setPersonalizationNumber("");
      setAllColorOptions([]);
      setVariantError(null);
    }
  }, [open]);

  const productName = selectedProduct
    ? selectedProduct.display_name || selectedProduct.catalog_styles?.title || selectedProduct.catalog_styles?.style_name || "Product"
    : "";

  const handleAdd = async () => {
    if (!selectedProduct) {
      toast.error("Select a product");
      return;
    }
    if (hasColors && !selectedColor) {
      toast.error("Select a color");
      return;
    }
    if (hasSizes && !selectedSize) {
      toast.error("Select a size");
      return;
    }

    const colorName = selectedColorObj?.name || "";
    const selectedSizeObj = availableSizes.find((s) => s.name === selectedSize);

    const lineTotal = quantity * unitPrice;
    await onAdd({
      team_store_product_id: selectedProduct.id,
      product_name_snapshot: productName,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      variant_snapshot: {
        size: selectedSize || undefined,
        color: colorName || undefined,
        colorCode: selectedColor || undefined,
        sku: selectedSizeObj?.sku || undefined,
      },
      personalization_name: personalizationName || null,
      personalization_number: personalizationNumber || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
          <DialogDescription>Select a product and variant to add to the order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Product picker */}
          <div>
            <Label>Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
              <SelectContent>
                {storeProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name || p.catalog_styles?.style_name || `Style ${p.style_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variant loading */}
          {variantsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading variants…
            </div>
          )}

          {variantError && (
            <p className="text-sm text-destructive">{variantError}</p>
          )}

          {/* Color + Size dropdowns (only after variants loaded) */}
          {selectedProduct && !variantsLoading && !variantError && (
            <>
              {hasColors && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Color */}
                  <div>
                    <Label>Color</Label>
                    <Select value={selectedColor} onValueChange={(v) => { setSelectedColor(v); setSelectedSize(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select color…" /></SelectTrigger>
                      <SelectContent>
                        {filteredColors.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size */}
                  <div>
                    <Label>Size</Label>
                    <Select value={selectedSize} onValueChange={setSelectedSize} disabled={!selectedColor}>
                      <SelectTrigger><SelectValue placeholder={selectedColor ? "Select size…" : "Pick color first"} /></SelectTrigger>
                      <SelectContent>
                        {availableSizes.map((s) => (
                          <SelectItem key={s.sku || s.name} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* No variants available */}
              {!hasColors && allColorOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">No size/color variants found for this product.</p>
              )}
            </>
          )}

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Unit Price</Label>
              <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Personalization */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Personalization Name</Label>
              <Input value={personalizationName} onChange={(e) => setPersonalizationName(e.target.value)} />
            </div>
            <div>
              <Label>Personalization #</Label>
              <Input value={personalizationNumber} onChange={(e) => setPersonalizationNumber(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
