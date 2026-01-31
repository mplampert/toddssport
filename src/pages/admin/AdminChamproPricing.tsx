import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Pencil, DollarSign, Percent } from "lucide-react";
import { formatPrice } from "@/lib/champroPricing";

interface ProductWithPricing {
  id: string;
  product_master: string;
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

export default function AdminChamproPricing() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithPricing | null>(null);
  
  // Edit form state
  const [baseCost, setBaseCost] = useState("");
  const [expressUpcharge, setExpressUpcharge] = useState("");
  const [expressPlusUpcharge, setExpressPlusUpcharge] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [rushMarkupPercent, setRushMarkupPercent] = useState("");
  const [moq, setMoq] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from("champro_products")
        .select("*")
        .order("sport");

      if (productsError) throw productsError;

      // Fetch wholesale data
      const { data: wholesaleData } = await supabase
        .from("champro_wholesale")
        .select("*");

      // Fetch pricing rules
      const { data: pricingData } = await supabase
        .from("champro_pricing_rules")
        .select("*");

      // Combine the data
      const combined: ProductWithPricing[] = (productsData || []).map((product) => ({
        ...product,
        wholesale: wholesaleData?.find((w) => w.champro_product_id === product.id) || null,
        pricing: pricingData?.find((p) => p.champro_product_id === product.id) || null,
      }));

      setProducts(combined);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(product: ProductWithPricing) {
    setEditingProduct(product);
    setBaseCost(product.wholesale?.base_cost_per_unit?.toString() || "");
    setExpressUpcharge(product.wholesale?.express_upcharge_cost_per_unit?.toString() || "");
    setExpressPlusUpcharge(product.wholesale?.express_plus_upcharge_cost_per_unit?.toString() || "");
    setMarkupPercent(product.pricing?.markup_percent?.toString() || "50");
    setRushMarkupPercent(product.pricing?.rush_markup_percent?.toString() || "");
    setMoq(product.moq_custom?.toString() || "12");
  }

  async function handleSave() {
    if (!editingProduct) return;

    setSaving(true);
    try {
      // Update product MOQ
      const { error: productError } = await supabase
        .from("champro_products")
        .update({ moq_custom: parseInt(moq) || 12 })
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

      // Update or insert pricing rules
      const pricingData = {
        champro_product_id: editingProduct.id,
        markup_percent: parseFloat(markupPercent) || 50,
        rush_markup_percent: rushMarkupPercent ? parseFloat(rushMarkupPercent) : null,
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

      toast.success("Pricing updated successfully");
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Error saving pricing:", err);
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  }

  // Calculate retail price for display
  function getRetailPrice(product: ProductWithPricing): string {
    if (!product.wholesale || !product.pricing) return "—";
    const base = product.wholesale.base_cost_per_unit;
    const markup = product.pricing.markup_percent / 100;
    return formatPrice(base * (1 + markup));
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-accent" />
              Champro Pricing
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage wholesale costs and markup percentages for custom uniforms
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead className="text-right">Base Cost</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                  <TableHead className="text-right">Retail Price</TableHead>
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="capitalize">{product.sport}</TableCell>
                    <TableCell className="text-right">
                      {product.wholesale
                        ? formatPrice(product.wholesale.base_cost_per_unit)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.pricing
                        ? `${product.pricing.markup_percent}%`
                        : "—"}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-accent" />
                Edit Pricing: {editingProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Update wholesale costs and markup percentages for this product.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-4 border-b border-border pb-4">
                <h4 className="font-medium text-foreground">Wholesale Costs</h4>
                
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expressUpcharge">10-Day Rush Cost (+$)</Label>
                    <Input
                      id="expressUpcharge"
                      type="number"
                      step="0.01"
                      value={expressUpcharge}
                      onChange={(e) => setExpressUpcharge(e.target.value)}
                      placeholder="8.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expressPlusUpcharge">5-Day Rush Cost (+$)</Label>
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
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Markup Rules</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="markupPercent">Base Markup (%)</Label>
                    <Input
                      id="markupPercent"
                      type="number"
                      step="0.1"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(e.target.value)}
                      placeholder="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rushMarkupPercent">Rush Markup (%)</Label>
                    <Input
                      id="rushMarkupPercent"
                      type="number"
                      step="0.1"
                      value={rushMarkupPercent}
                      onChange={(e) => setRushMarkupPercent(e.target.value)}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use base markup
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {baseCost && markupPercent && (
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Calculated Retail:</p>
                  <p className="text-2xl font-bold text-accent">
                    {formatPrice(parseFloat(baseCost) * (1 + parseFloat(markupPercent) / 100))}
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
      </div>
    </AdminLayout>
  );
}
