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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { formatPrice, calculatePerUnit, type GlobalPricing } from "@/lib/champroPricing";

interface ProductWithPricing {
  id: string;
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  moq_custom: number;
  wholesale: {
    id: string;
    base_cost: number;
  } | null;
}

interface SkuPricingTableProps {
  products: ProductWithPricing[];
  globalPricing: GlobalPricing;
  selectedSport: string | null;
  onRefresh: () => void;
}

export function SkuPricingTable({
  products,
  globalPricing,
  selectedSport,
  onRefresh,
}: SkuPricingTableProps) {
  const [editingProduct, setEditingProduct] = useState<ProductWithPricing | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [baseCost, setBaseCost] = useState("");
  const [moq, setMoq] = useState("");
  const [sku, setSku] = useState("");

  // Filter products by sport if selected
  const filteredProducts = selectedSport
    ? products.filter((p) => p.sport === selectedSport)
    : products;

  function getRetailPrice(product: ProductWithPricing): string {
    if (!product.wholesale) return "—";
    
    return formatPrice(
      calculatePerUnit(
        { baseCost: product.wholesale.base_cost },
        globalPricing,
        "standard"
      )
    );
  }

  function getRushPrice(product: ProductWithPricing): string {
    if (!product.wholesale) return "—";
    
    return formatPrice(
      calculatePerUnit(
        { baseCost: product.wholesale.base_cost },
        globalPricing,
        "express"
      )
    );
  }

  function openEditDialog(product: ProductWithPricing) {
    setEditingProduct(product);
    setBaseCost(product.wholesale?.base_cost?.toString() || "");
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
        base_cost: parseFloat(baseCost) || 0,
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

  // Preview calculation
  const previewRetail = baseCost
    ? calculatePerUnit({ baseCost: parseFloat(baseCost) }, globalPricing, "standard")
    : 0;
  const previewRush = baseCost
    ? calculatePerUnit({ baseCost: parseFloat(baseCost) }, globalPricing, "express")
    : 0;

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Product</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead className="text-right">Base Cost</TableHead>
              <TableHead className="text-right">Retail (Std)</TableHead>
              <TableHead className="text-right">Retail (Rush)</TableHead>
              <TableHead className="text-right">MOQ</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
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
                    ? formatPrice(product.wholesale.base_cost)
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold text-accent">
                  {getRetailPrice(product)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {getRushPrice(product)}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit: {editingProduct?.name}</DialogTitle>
            <DialogDescription>
              Update wholesale cost and product settings.
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

            {/* Wholesale Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseCost">Base Cost ($)</Label>
                <Input
                  id="baseCost"
                  type="number"
                  step="0.01"
                  value={baseCost}
                  onChange={(e) => setBaseCost(e.target.value)}
                  placeholder="35.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moq">Min. Order Qty</Label>
                <Input
                  id="moq"
                  type="number"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>

            {/* Preview */}
            {baseCost && (
              <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Standard Retail:</span>
                  <span className="font-bold text-accent">{formatPrice(previewRetail)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rush Retail (+{globalPricing.rushPercent}%):</span>
                  <span className="font-medium">{formatPrice(previewRush)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Using {globalPricing.markupPercent}% markup + {globalPricing.rushPercent}% rush fee
                </p>
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
