import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Filter, X } from "lucide-react";
import { GlobalSettingsCard } from "@/components/admin/champro-pricing/GlobalSettingsCard";
import { SkuPricingTable } from "@/components/admin/champro-pricing/SkuPricingTable";
import { type GlobalPricing } from "@/lib/champroPricing";

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

export default function AdminChamproPricing() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing>({ markupPercent: 50, rushPercent: 20 });
  const [sports, setSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

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
        .order("sport");

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
        .single();

      // Combine products with their wholesale data
      const combined: ProductWithPricing[] = (productsData || []).map((product) => {
        const wholesale = wholesaleData?.find((w) => w.champro_product_id === product.id);
        return {
          id: product.id,
          product_master: product.product_master,
          sku: product.sku,
          name: product.name,
          sport: product.sport,
          moq_custom: product.moq_custom,
          wholesale: wholesale
            ? {
                id: wholesale.id,
                base_cost: wholesale.base_cost,
              }
            : null,
        };
      });

      // Get unique sports
      const uniqueSports = [...new Set((productsData || []).map((p) => p.sport))].sort();

      setProducts(combined);
      setSports(uniqueSports);
      
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
              Manage wholesale costs and global markup/rush settings
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Settings */}
            <GlobalSettingsCard onUpdate={fetchAllData} />

            {/* Sport Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by sport:</span>
              <div className="flex flex-wrap gap-2">
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
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* SKU Table */}
            <SkuPricingTable
              products={products}
              globalPricing={globalPricing}
              selectedSport={selectedSport}
              onRefresh={fetchAllData}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
