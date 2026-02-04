import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Package, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PromoProduct {
  id: string;
  product_id: string;
  product_name: string;
  description: string | null;
  product_brand: string | null;
  product_category: string | null;
  promo_media?: { url: string; is_primary: boolean }[];
  promo_pricing?: { quantity_min: number; price: number }[];
}

interface PromoProductPickerProps {
  selectedProducts: PromoProduct[];
  onSelectionChange: (products: PromoProduct[]) => void;
}

export function PromoProductPicker({ selectedProducts, onSelectionChange }: PromoProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelection, setLocalSelection] = useState<Set<string>>(
    new Set(selectedProducts.map(p => p.id))
  );

  const { data: products, isLoading } = useQuery({
    queryKey: ['promo-products-picker', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('promo_products')
        .select(`
          *,
          promo_media (url, is_primary),
          promo_pricing (quantity_min, price)
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('product_name');

      if (searchTerm) {
        query = query.or(`product_name.ilike.%${searchTerm}%,product_id.ilike.%${searchTerm}%,product_category.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as PromoProduct[];
    },
    enabled: isOpen,
  });

  const getPrimaryImage = (product: PromoProduct) => {
    const primary = product.promo_media?.find(m => m.is_primary);
    return primary?.url || product.promo_media?.[0]?.url;
  };

  const getLowestPrice = (product: PromoProduct) => {
    if (!product.promo_pricing?.length) return null;
    return Math.min(...product.promo_pricing.map(p => p.price));
  };

  const toggleProduct = (product: PromoProduct) => {
    const newSelection = new Set(localSelection);
    if (newSelection.has(product.id)) {
      newSelection.delete(product.id);
    } else {
      newSelection.add(product.id);
    }
    setLocalSelection(newSelection);
  };

  const handleConfirm = () => {
    const selected = products?.filter(p => localSelection.has(p.id)) || [];
    // Merge with existing selected products that might not be in current search
    const existingNotInSearch = selectedProducts.filter(
      sp => !products?.find(p => p.id === sp.id) && localSelection.has(sp.id)
    );
    onSelectionChange([...selected, ...existingNotInSearch]);
    setIsOpen(false);
  };

  const removeProduct = (productId: string) => {
    onSelectionChange(selectedProducts.filter(p => p.id !== productId));
    const newSelection = new Set(localSelection);
    newSelection.delete(productId);
    setLocalSelection(newSelection);
  };

  return (
    <div className="space-y-3">
      {/* Selected Products Display */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map((product) => (
            <Badge
              key={product.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
            >
              <span className="text-xs truncate max-w-32">{product.product_name}</span>
              <button
                onClick={() => removeProduct(product.id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Picker Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {selectedProducts.length > 0 
              ? `Add More Products (${selectedProducts.length} selected)`
              : 'Select Promo Products'
            }
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Promo Products
            </DialogTitle>
            <DialogDescription>
              Choose products from your synced PromoStandards catalog to include in the lookbook.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Product Grid */}
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : !products?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No products found.</p>
                  <p className="text-sm text-muted-foreground">
                    Sync products from the Promo Products page first.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {products.map((product) => (
                    <Card 
                      key={product.id}
                      className={`cursor-pointer transition-all ${
                        localSelection.has(product.id) 
                          ? 'ring-2 ring-accent bg-accent/10' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleProduct(product)}
                    >
                      <CardContent className="p-3 flex gap-3">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={localSelection.has(product.id)}
                            onCheckedChange={() => toggleProduct(product)}
                          />
                          {getPrimaryImage(product) ? (
                            <img
                              src={getPrimaryImage(product)}
                              alt={product.product_name}
                              className="w-16 h-16 object-contain bg-secondary rounded shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-secondary rounded flex items-center justify-center shrink-0">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">
                            {product.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.product_id}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {product.product_category && (
                              <Badge variant="secondary" className="text-xs">
                                {product.product_category}
                              </Badge>
                            )}
                            {getLowestPrice(product) && (
                              <span className="text-xs text-accent font-medium">
                                ${getLowestPrice(product)?.toFixed(2)}+
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {localSelection.size} product(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} className="btn-cta">
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
