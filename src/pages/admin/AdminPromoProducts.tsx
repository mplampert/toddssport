import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  RefreshCw, 
  Star, 
  Download, 
  Package, 
  Image as ImageIcon,
  DollarSign,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PromoProduct {
  id: string;
  product_id: string;
  product_name: string;
  description: string | null;
  product_brand: string | null;
  product_category: string | null;
  product_sub_category: string | null;
  is_featured: boolean;
  last_synced_at: string | null;
  promo_media?: { url: string; is_primary: boolean }[];
  promo_pricing?: { quantity_min: number; price: number }[];
}

export default function AdminPromoProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [syncProductId, setSyncProductId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch synced products from our database
  const { data: products, isLoading } = useQuery({
    queryKey: ['promo-products', searchTerm],
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

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PromoProduct[];
    }
  });

  // Sync a single product
  const syncProduct = useMutation({
    mutationFn: async (productId: string) => {
      // Sync product data
      const { data: productResult, error: productError } = await supabase.functions.invoke('promostandards-sync', {
        body: { action: 'sync_product', productId }
      });
      if (productError) throw productError;
      if (productResult.error) throw new Error(productResult.error);

      // Sync media
      const { data: mediaResult, error: mediaError } = await supabase.functions.invoke('promostandards-sync', {
        body: { action: 'sync_media', productId }
      });
      if (mediaError) throw mediaError;

      // Get pricing
      const { data: pricingResult, error: pricingError } = await supabase.functions.invoke('promostandards-sync', {
        body: { action: 'get_pricing', productId }
      });
      if (pricingError) throw pricingError;

      return { 
        product: productResult.product, 
        mediaCount: mediaResult.mediaCount,
        pricingCount: pricingResult.pricingCount
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['promo-products'] });
      toast({
        title: "Product synced!",
        description: `Synced ${data.mediaCount} images and ${data.pricingCount} price breaks.`
      });
      setSyncProductId("");
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync product",
        variant: "destructive"
      });
    }
  });

  // Toggle featured status
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('promo_products')
        .update({ is_featured: isFeatured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-products'] });
    }
  });

  // Get sellable products list
  const getSellable = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('promostandards-sync', {
        body: { action: 'get_sellable' }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sellable products retrieved",
        description: `Found ${data.count} sellable products from ImprintID.`
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to get sellable products",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  const getPrimaryImage = (product: PromoProduct) => {
    const primary = product.promo_media?.find(m => m.is_primary);
    return primary?.url || product.promo_media?.[0]?.url;
  };

  const getLowestPrice = (product: PromoProduct) => {
    if (!product.promo_pricing?.length) return null;
    return Math.min(...product.promo_pricing.map(p => p.price));
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const featuredProducts = products?.filter(p => p.is_featured) || [];
  const allProducts = products || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Promo Products</h1>
          <p className="text-muted-foreground">
            Browse and sync products from PromoStandards (ImprintID) for lookbooks and quotes.
          </p>
        </div>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse">Browse Products</TabsTrigger>
            <TabsTrigger value="sync">Sync Products</TabsTrigger>
            <TabsTrigger value="featured">
              Featured ({featuredProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {selectedProducts.size > 0 && (
              <div className="bg-accent/50 p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">
                  {selectedProducts.size} product(s) selected
                </span>
                <Button size="sm" variant="outline" onClick={() => setSelectedProducts(new Set())}>
                  Clear Selection
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : allProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No products synced yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the Sync tab to import products from PromoStandards.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allProducts.map((product) => (
                  <Card key={product.id} className={`relative ${selectedProducts.has(product.id) ? 'ring-2 ring-accent' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                          <div>
                            <CardTitle className="text-sm line-clamp-2">
                              {product.product_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {product.product_id}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={product.is_featured ? 'text-accent' : 'text-muted-foreground'}
                          onClick={() => toggleFeatured.mutate({ 
                            id: product.id, 
                            isFeatured: !product.is_featured 
                          })}
                        >
                          <Star className="w-4 h-4" fill={product.is_featured ? 'currentColor' : 'none'} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {getPrimaryImage(product) ? (
                        <img
                          src={getPrimaryImage(product)}
                          alt={product.product_name}
                          className="w-full h-32 object-contain bg-secondary rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-secondary rounded flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {product.product_category && (
                          <Badge variant="secondary" className="text-xs">
                            {product.product_category}
                          </Badge>
                        )}
                        {product.product_brand && (
                          <Badge variant="outline" className="text-xs">
                            {product.product_brand}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ImageIcon className="w-3 h-3" />
                          <span>{product.promo_media?.length || 0}</span>
                        </div>
                        {getLowestPrice(product) && (
                          <div className="flex items-center gap-1 font-medium text-accent">
                            <DollarSign className="w-3 h-3" />
                            <span>From ${getLowestPrice(product)?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Sync Individual Product
                </CardTitle>
                <CardDescription>
                  Enter a PromoStandards Product ID to sync it from ImprintID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Product ID (e.g., 1234)"
                    value={syncProductId}
                    onChange={(e) => setSyncProductId(e.target.value)}
                  />
                  <Button
                    onClick={() => syncProduct.mutate(syncProductId)}
                    disabled={!syncProductId || syncProduct.isPending}
                  >
                    {syncProduct.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will fetch product details, images, and pricing from the PromoStandards API.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Discover Sellable Products
                </CardTitle>
                <CardDescription>
                  Get a list of all sellable products from ImprintID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => getSellable.mutate()}
                  disabled={getSellable.isPending}
                  variant="outline"
                >
                  {getSellable.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Get Sellable Products
                </Button>
                
                {getSellable.data?.products && (
                  <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                    {getSellable.data.products.slice(0, 50).map((p: any, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between text-sm p-1 hover:bg-secondary rounded cursor-pointer"
                        onClick={() => setSyncProductId(p.productId)}
                      >
                        <span className="truncate">{p.productName}</span>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          {p.productId}
                        </Badge>
                      </div>
                    ))}
                    {getSellable.data.products.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Showing 50 of {getSellable.data.products.length} products
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured" className="space-y-4">
            {featuredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No featured products yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Star products in the Browse tab to add them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product) => (
                  <Card key={product.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm line-clamp-2">
                            {product.product_name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {product.product_id}
                          </CardDescription>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-accent"
                          onClick={() => toggleFeatured.mutate({
                            id: product.id, 
                            isFeatured: false 
                          })}
                        >
                          <Star className="w-4 h-4" fill="currentColor" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {getPrimaryImage(product) ? (
                        <img
                          src={getPrimaryImage(product)}
                          alt={product.product_name}
                          className="w-full h-32 object-contain bg-secondary rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-secondary rounded flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
