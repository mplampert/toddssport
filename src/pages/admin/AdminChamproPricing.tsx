import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Filter, X } from "lucide-react";
import { GlobalSettingsCard } from "@/components/admin/champro-pricing/GlobalSettingsCard";
import { SportSettingsPanel } from "@/components/admin/champro-pricing/SportSettingsPanel";
import { SkuPricingTable } from "@/components/admin/champro-pricing/SkuPricingTable";

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

export default function AdminChamproPricing() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [globalSetting, setGlobalSetting] = useState<GlobalSetting>({ markup_percent: 50, rush_markup_percent: 50 });
  const [sportSettings, setSportSettings] = useState<SportSetting[]>([]);
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

      // Fetch pricing rules (SKU overrides)
      const { data: pricingData } = await supabase
        .from("champro_pricing_rules")
        .select("*");

      // Fetch global setting
      const { data: globalData } = await supabase
        .from("champro_pricing_settings")
        .select("*")
        .eq("scope", "global")
        .single();

      // Fetch sport settings
      const { data: sportData } = await supabase
        .from("champro_pricing_settings")
        .select("*")
        .eq("scope", "sport");

      // Combine products with their pricing data
      const combined: ProductWithPricing[] = (productsData || []).map((product) => ({
        ...product,
        wholesale: wholesaleData?.find((w) => w.champro_product_id === product.id) || null,
        pricing: pricingData?.find((p) => p.champro_product_id === product.id) || null,
      }));

      // Get unique sports
      const uniqueSports = [...new Set((productsData || []).map((p) => p.sport))].sort();

      setProducts(combined);
      setSports(uniqueSports);
      
      if (globalData) {
        setGlobalSetting({
          markup_percent: globalData.markup_percent,
          rush_markup_percent: globalData.rush_markup_percent,
        });
      }

      if (sportData) {
        setSportSettings(
          sportData.map((s) => ({
            sport: s.sport!,
            markup_percent: s.markup_percent,
            rush_markup_percent: s.rush_markup_percent,
          }))
        );
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
              Manage wholesale costs and markup hierarchy (Global → Sport → SKU)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Settings Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlobalSettingsCard onUpdate={fetchAllData} />
              <SportSettingsPanel sports={sports} onUpdate={fetchAllData} />
            </div>

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
              globalSetting={globalSetting}
              sportSettings={sportSettings}
              selectedSport={selectedSport}
              onRefresh={fetchAllData}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
