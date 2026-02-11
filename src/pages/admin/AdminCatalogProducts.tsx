import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Star, Upload, Package, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CatalogImportDialog } from "@/components/admin/catalog/CatalogImportDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface CatalogStyle {
  id: number;
  style_id: number;
  part_number: string | null;
  brand_name: string;
  style_name: string;
  title: string | null;
  description: string | null;
  base_category: string | null;
  style_image: string | null;
  is_featured: boolean;
  is_active: boolean;
  sustainable_style: boolean;
}

export default function AdminCatalogProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch styles
  const { data: styles, isLoading: stylesLoading } = useQuery({
    queryKey: ['catalog-styles', brandFilter, categoryFilter, featuredOnly],
    queryFn: async () => {
      let query = supabase
        .from('catalog_styles')
        .select('id, style_id, part_number, brand_name, style_name, title, description, base_category, style_image, is_featured, is_active, sustainable_style')
        .eq('is_active', true)
        .order('brand_name')
        .limit(200);

      if (brandFilter !== 'all') {
        query = query.eq('brand_name', brandFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('base_category', categoryFilter);
      }
      if (featuredOnly) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CatalogStyle[];
    }
  });

  // Get unique brands and categories for filters
  const { data: filterOptions } = useQuery({
    queryKey: ['catalog-filter-options'],
    queryFn: async () => {
      const [brandsRes, categoriesRes] = await Promise.all([
        supabase.from('catalog_styles').select('brand_name').order('brand_name'),
        supabase.from('catalog_styles').select('base_category').order('base_category')
      ]);
      
      const brands = [...new Set((brandsRes.data || []).map(r => r.brand_name).filter(Boolean))];
      const categories = [...new Set((categoriesRes.data || []).map(r => r.base_category).filter(Boolean))];
      
      return { brands, categories };
    }
  });

  // Toggle featured status
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: number; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('catalog_styles')
        .update({ is_featured: isFeatured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-styles'] });
      toast({ title: "Updated", description: "Product featured status updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Get stats
  const { data: stats } = useQuery({
    queryKey: ['catalog-stats'],
    queryFn: async () => {
      const [stylesCount, featuredCount, categoriesCount] = await Promise.all([
        supabase.from('catalog_styles').select('id', { count: 'exact', head: true }),
        supabase.from('catalog_styles').select('id', { count: 'exact', head: true }).eq('is_featured', true),
        supabase.from('catalog_categories').select('id', { count: 'exact', head: true })
      ]);
      return {
        styles: stylesCount.count || 0,
        featured: featuredCount.count || 0,
        categories: categoriesCount.count || 0
      };
    }
  });

  // Filter by search term
  const filteredStyles = useMemo(() => {
    if (!styles) return [];
    if (!searchTerm) return styles;
    
    const term = searchTerm.toLowerCase();
    return styles.filter(s => 
      s.style_name?.toLowerCase().includes(term) ||
      s.brand_name?.toLowerCase().includes(term) ||
      s.part_number?.toLowerCase().includes(term) ||
      s.title?.toLowerCase().includes(term)
    );
  }, [styles, searchTerm]);

  // Strip HTML from description
  const stripHtml = (html: string) => {
    return html?.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() || '';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Deprecation Notice */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Deprecated</AlertTitle>
          <AlertDescription>
            This page is deprecated. Please use{" "}
            <Link to="/admin/catalog/master/brands" className="underline font-medium">
              /admin/catalog/master/brands
            </Link>{" "}
            to manage products. This page will be removed soon.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Catalog</h1>
            <p className="text-muted-foreground">
              Browse, search, and mark featured products for lookbooks
            </p>
          </div>
          <Button onClick={() => setShowImportDialog(true)} className="btn-cta">
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Styles</CardDescription>
              <CardTitle className="text-3xl">{stats?.styles.toLocaleString() || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Featured</CardDescription>
              <CardTitle className="text-3xl text-accent">{stats?.featured || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl">{stats?.categories || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Style, brand, part #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {filterOptions?.brands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filterOptions?.categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Show Only</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={featuredOnly}
                    onCheckedChange={setFeaturedOnly}
                  />
                  <span className="text-sm">Featured items</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Products ({filteredStyles.length})
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['catalog-styles'] })}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stylesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStyles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No products found. Try adjusting filters or import data.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStyles.map(style => (
                  <div 
                    key={style.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      style.is_featured ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-secondary relative">
                      {style.style_image ? (
                        <img 
                          src={`https://www.ssactivewear.com/${style.style_image}`}
                          alt={style.style_name}
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground opacity-50" />
                        </div>
                      )}
                      {style.sustainable_style && (
                        <Badge className="absolute top-2 left-2 bg-green-600">Eco</Badge>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{style.style_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{style.brand_name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={style.is_featured ? 'text-accent' : 'text-muted-foreground'}
                          onClick={() => toggleFeatured.mutate({ 
                            id: style.id, 
                            isFeatured: !style.is_featured 
                          })}
                        >
                          <Star className={`w-5 h-5 ${style.is_featured ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                      
                      {style.part_number && (
                        <p className="text-xs text-muted-foreground mt-1">#{style.part_number}</p>
                      )}
                      
                      <Badge variant="secondary" className="mt-2">
                        {style.base_category || 'Uncategorized'}
                      </Badge>
                      
                      {style.title && (
                        <p className="text-xs mt-2 line-clamp-2">{style.title}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <CatalogImportDialog 
          onClose={() => setShowImportDialog(false)}
          onComplete={() => {
            setShowImportDialog(false);
            queryClient.invalidateQueries({ queryKey: ['catalog-styles'] });
            queryClient.invalidateQueries({ queryKey: ['catalog-stats'] });
            queryClient.invalidateQueries({ queryKey: ['catalog-filter-options'] });
          }}
        />
      )}
    </AdminLayout>
  );
}
