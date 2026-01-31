import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Filter, X, Download } from "lucide-react";
import { GlobalSettingsCard } from "@/components/admin/champro-pricing/GlobalSettingsCard";
import { SkuPricingTable } from "@/components/admin/champro-pricing/SkuPricingTable";
import { type GlobalPricing, type ChamproCategory, getCategoryDisplayName } from "@/lib/champroPricing";

interface ProductWithPricing {
  id: string;
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  category: ChamproCategory;
  moq_custom: number;
  wholesale: {
    id: string;
    base_cost: number;
  } | null;
}

const CATEGORIES: ChamproCategory[] = ["JERSEYS", "TSHIRTS", "PANTS", "OUTERWEAR", "SHORTS", "ACCESSORIES"];

export default function AdminChamproPricing() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing>({ markupPercent: 50, rushPercent: 0 });
  const [sports, setSports] = useState<string[]>([]);
  const [categories, setCategories] = useState<ChamproCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ChamproCategory | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("champro_products")
        .select("*")
        .order("sport")
        .order("category")
        .order("name");

      if (productsError) throw productsError;

      // Fetch wholesale data
      const { data: wholesaleData } = await supabase
        .from("champro_wholesale")
        .select("*");

      // Fetch global setting
      const { data: globalData } = await supabase
        .from("champro_pricing_settings")
        .select("*")
        .eq("scope", "global")
        .maybeSingle();

      // Combine products with their wholesale data
      const combined: ProductWithPricing[] = (productsData || []).map((product) => {
        const wholesale = wholesaleData?.find((w) => w.champro_product_id === product.id);
        return {
          id: product.id,
          product_master: product.product_master,
          sku: product.sku,
          name: product.name,
          sport: product.sport,
          category: product.category as ChamproCategory,
          moq_custom: product.moq_custom,
          wholesale: wholesale
            ? {
                id: wholesale.id,
                base_cost: wholesale.base_cost,
              }
            : null,
        };
      });

      // Get unique sports and categories
      const uniqueSports = [...new Set((productsData || []).map((p) => p.sport))].sort();
      const uniqueCategories = [...new Set((productsData || []).map((p) => p.category))] as ChamproCategory[];

      setProducts(combined);
      setSports(uniqueSports);
      setCategories(uniqueCategories.filter((c) => CATEGORIES.includes(c)));
      
      if (globalData) {
        setGlobalPricing({
          markupPercent: globalData.markup_percent,
          rushPercent: globalData.rush_percent,
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedSkus() {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("champro-seed-skus", {
        body: {},
      });

      if (error) throw error;

      toast.success(data.message || "SKUs seeded successfully");
      fetchAllData();
    } catch (err) {
      console.error("Error seeding SKUs:", err);
      toast.error("Failed to seed SKUs from Champro");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-accent" />
              Champro Pricing
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage per-SKU wholesale costs with global markup settings
            </p>
          </div>
          <Button onClick={handleSeedSkus} disabled={seeding} variant="outline">
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Seed SKUs from Champro
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Settings */}
            <GlobalSettingsCard onUpdate={fetchAllData} />

            {/* Filters */}
            <div className="space-y-3">
              {/* Sport Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sport:</span>
                {sports.map((sport) => (
                  <Button
                    key={sport}
                    variant={selectedSport === sport ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSport(selectedSport === sport ? null : sport)}
                    className="capitalize"
                  >
                    {sport}
                  </Button>
                ))}
                {selectedSport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSport(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground ml-6">Category:</span>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  >
                    {getCategoryDisplayName(category)}
                  </Button>
                ))}
                {selectedCategory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* SKU Table */}
            <SkuPricingTable
              products={products}
              globalPricing={globalPricing}
              selectedSport={selectedSport}
              selectedCategory={selectedCategory}
              onRefresh={fetchAllData}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
