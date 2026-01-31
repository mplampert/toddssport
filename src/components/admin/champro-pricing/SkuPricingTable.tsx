import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { formatPrice, getEffectiveMarkup, calculateRetailPerUnit, type Wholesale, type EffectiveMarkup } from "@/lib/champroPricing";

interface ProductWithPricing {
  id: string;
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  moq_custom: number;
  wholesale: {
    id: string;
    base_cost_per_unit: number;
    express_upcharge_cost_per_unit: number;
    express_plus_upcharge_cost_per_unit: number;
  } | null;
  pricing: {
    id: string;
    markup_percent: number;
    rush_markup_percent: number | null;
  } | null;
}

interface GlobalSetting {
  markup_percent: number;
  rush_markup_percent: number;
}

interface SportSetting {
  sport: string;
  markup_percent: number;
  rush_markup_percent: number;
}

interface SkuPricingTableProps {
  products: ProductWithPricing[];
  globalSetting: GlobalSetting;
  sportSettings: SportSetting[];
  selectedSport: string | null;
  onRefresh: () => void;
}

export function SkuPricingTable({
  products,
  globalSetting,
  sportSettings,
  selectedSport,
  onRefresh,
}: SkuPricingTableProps) {
  const [editingProduct, setEditingProduct] = useState<ProductWithPricing | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [baseCost, setBaseCost] = useState("");
  const [expressUpcharge, setExpressUpcharge] = useState("");
  const [expressPlusUpcharge, setExpressPlusUpcharge] = useState("");
  const [overrideMarkup, setOverrideMarkup] = useState("");
  const [overrideRushMarkup, setOverrideRushMarkup] = useState("");
  const [moq, setMoq] = useState("");
  const [sku, setSku] = useState("");

  // Filter products by sport if selected
  const filteredProducts = selectedSport
    ? products.filter((p) => p.sport === selectedSport)
    : products;

  function getEffectiveMarkupForProduct(product: ProductWithPricing): EffectiveMarkup {
    const sportSetting = sportSettings.find((s) => s.sport === product.sport);
    
    return getEffectiveMarkup({
      skuOverride: product.pricing
        ? {
            markup_percent: product.pricing.markup_percent,
            rush_markup_percent: product.pricing.rush_markup_percent,
          }
        : null,
      sportSetting: sportSetting || null,
      globalSetting,
    });
  }

  function getMarkupSource(product: ProductWithPricing): "sku" | "sport" | "global" {
    if (product.pricing?.markup_percent != null && product.pricing?.rush_markup_percent != null) {
      return "sku";
    }
    if (sportSettings.some((s) => s.sport === product.sport)) {
      return "sport";
    }
    return "global";
  }

  function getRetailPrice(product: ProductWithPricing): string {
    if (!product.wholesale) return "—";
    
    const wholesale: Wholesale = {
      baseCost: product.wholesale.base_cost_per_unit,
      expressUpchargeCost: product.wholesale.express_upcharge_cost_per_unit,
      expressPlusUpchargeCost: product.wholesale.express_plus_upcharge_cost_per_unit,
    };
    
    const markup = getEffectiveMarkupForProduct(product);
    return formatPrice(calculateRetailPerUnit(wholesale, markup, "standard"));
  }

  function openEditDialog(product: ProductWithPricing) {
    setEditingProduct(product);
    setBaseCost(product.wholesale?.base_cost_per_unit?.toString() || "");
    setExpressUpcharge(product.wholesale?.express_upcharge_cost_per_unit?.toString() || "");
    setExpressPlusUpcharge(product.wholesale?.express_plus_upcharge_cost_per_unit?.toString() || "");
    setOverrideMarkup(product.pricing?.markup_percent?.toString() || "");
    setOverrideRushMarkup(product.pricing?.rush_markup_percent?.toString() || "");
    setMoq(product.moq_custom?.toString() || "12");
    setSku(product.sku || "");
  }

  async function handleSave() {
    if (!editingProduct) return;

    setSaving(true);
    try {
      // Update product MOQ and SKU
      const { error: productError } = await supabase
        .from("champro_products")
        .update({
          moq_custom: parseInt(moq) || 12,
          sku: sku || null,
        })
        .eq("id", editingProduct.id);

      if (productError) throw productError;

      // Update or insert wholesale
      const wholesaleData = {
        champro_product_id: editingProduct.id,
        base_cost_per_unit: parseFloat(baseCost) || 0,
        express_upcharge_cost_per_unit: parseFloat(expressUpcharge) || 0,
        express_plus_upcharge_cost_per_unit: parseFloat(expressPlusUpcharge) || 0,
      };

      if (editingProduct.wholesale?.id) {
        const { error } = await supabase
          .from("champro_wholesale")
          .update(wholesaleData)
          .eq("id", editingProduct.wholesale.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("champro_wholesale")
          .insert(wholesaleData);
        if (error) throw error;
      }

      // Handle SKU override - only create/update if values provided
      const hasOverride = overrideMarkup !== "" || overrideRushMarkup !== "";
      
      if (hasOverride) {
        const pricingData = {
          champro_product_id: editingProduct.id,
          markup_percent: overrideMarkup ? parseFloat(overrideMarkup) : null,
          rush_markup_percent: overrideRushMarkup ? parseFloat(overrideRushMarkup) : null,
        };

        if (editingProduct.pricing?.id) {
          const { error } = await supabase
            .from("champro_pricing_rules")
            .update(pricingData)
            .eq("id", editingProduct.pricing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("champro_pricing_rules")
            .insert(pricingData);
          if (error) throw error;
        }
      } else if (editingProduct.pricing?.id) {
        // Remove override if fields are empty
        const { error } = await supabase
          .from("champro_pricing_rules")
          .delete()
          .eq("id", editingProduct.pricing.id);
        if (error) throw error;
      }

      toast.success("Pricing updated successfully");
      setEditingProduct(null);
      onRefresh();
    } catch (err) {
      console.error("Error saving pricing:", err);
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  }

  const effectiveMarkupForPreview = editingProduct
    ? getEffectiveMarkupForProduct(editingProduct)
    : null;

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Product</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead className="text-right">Base Cost</TableHead>
              <TableHead className="text-right">Markup</TableHead>
              <TableHead className="text-right">Retail Price</TableHead>
              <TableHead className="text-right">MOQ</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const markup = getEffectiveMarkupForProduct(product);
              const source = getMarkupSource(product);
              
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku || product.product_master}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{product.sport}</TableCell>
                  <TableCell className="text-right">
                    {product.wholesale
                      ? formatPrice(product.wholesale.base_cost_per_unit)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{markup.markupPercent}%</span>
                      <Badge
                        variant={
                          source === "sku"
                            ? "default"
                            : source === "sport"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {source}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-accent">
                    {getRetailPrice(product)}
                  </TableCell>
                  <TableCell className="text-right">{product.moq_custom}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit: {editingProduct?.name}</DialogTitle>
            <DialogDescription>
              Update wholesale costs and optional SKU-level markup override.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* SKU field */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. JSBJ8YACL"
              />
            </div>

            {/* Wholesale Costs */}
            <div className="space-y-3 border-b border-border pb-4">
              <h4 className="font-medium text-foreground">Wholesale Costs</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="baseCost" className="text-xs">Base Cost ($)</Label>
                  <Input
                    id="baseCost"
                    type="number"
                    step="0.01"
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value)}
                    placeholder="35.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expressUpcharge" className="text-xs">10-Day Rush (+$)</Label>
                  <Input
                    id="expressUpcharge"
                    type="number"
                    step="0.01"
                    value={expressUpcharge}
                    onChange={(e) => setExpressUpcharge(e.target.value)}
                    placeholder="8.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expressPlusUpcharge" className="text-xs">5-Day Rush (+$)</Label>
                  <Input
                    id="expressPlusUpcharge"
                    type="number"
                    step="0.01"
                    value={expressPlusUpcharge}
                    onChange={(e) => setExpressPlusUpcharge(e.target.value)}
                    placeholder="15.00"
                  />
                </div>
              </div>
              <div className="w-32">
                <Label htmlFor="moq" className="text-xs">Min. Order Qty</Label>
                <Input
                  id="moq"
                  type="number"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>

            {/* SKU Override */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Markup Override (optional)</h4>
                {effectiveMarkupForPreview && (
                  <p className="text-xs text-muted-foreground">
                    Current: {effectiveMarkupForPreview.markupPercent}% ({getMarkupSource(editingProduct!)})
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use sport or global defaults
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="overrideMarkup" className="text-xs">Base Markup (%)</Label>
                  <Input
                    id="overrideMarkup"
                    type="number"
                    step="0.1"
                    value={overrideMarkup}
                    onChange={(e) => setOverrideMarkup(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overrideRushMarkup" className="text-xs">Rush Markup (%)</Label>
                  <Input
                    id="overrideRushMarkup"
                    type="number"
                    step="0.1"
                    value={overrideRushMarkup}
                    onChange={(e) => setOverrideRushMarkup(e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {baseCost && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Calculated Retail:</p>
                <p className="text-2xl font-bold text-accent">
                  {formatPrice(
                    parseFloat(baseCost) *
                      (1 +
                        (overrideMarkup
                          ? parseFloat(overrideMarkup)
                          : effectiveMarkupForPreview?.markupPercent || 50) /
                          100)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">per unit (standard lead time)</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
