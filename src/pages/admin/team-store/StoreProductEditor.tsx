import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useEffectiveCategories } from "@/components/admin/team-stores/StoreCategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductLogosTab } from "@/components/admin/team-stores/ProductLogosTab";
import { ProductVariantsTab } from "@/components/admin/team-stores/ProductVariantsTab";
import { ProductMessagesPanel } from "@/components/admin/team-stores/ProductMessagesPanel";
import { ProductOverridesPanel } from "@/components/admin/team-stores/ProductOverridesPanel";
import { ProductVariantImagesTab } from "@/components/admin/team-stores/ProductVariantImagesTab";
import { ProductEditorOverviewTab } from "@/components/admin/team-stores/ProductEditorOverviewTab";
import { ProductEditorPricingTab } from "@/components/admin/team-stores/ProductEditorPricingTab";
import { ProductPersonalizationTab } from "@/components/admin/team-stores/ProductPersonalizationTab";
import { ProductDecorationPricingTab } from "@/components/admin/team-stores/ProductDecorationPricingTab";
import { getProductImage, handleImageError } from "@/lib/productImages";
import type { StoreProduct } from "@/components/admin/team-stores/ProductListPane";

export default function StoreProductEditor() {
  const { store } = useTeamStoreContext();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { visible: visibleCategories } = useEffectiveCategories(store.id);

  const { data: item, isLoading } = useQuery({
    queryKey: ["team-store-product-editor", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select(`
          id, style_id, sort_order, notes, price_override, active,
          fundraising_enabled, fundraising_amount_per_unit, fundraising_percentage,
          personalization_enabled, personalization_price, personalization_config,
          personalization_override_enabled, personalization_settings,
          decoration_pricing_override_enabled, decoration_prices_override,
          screen_print_enabled, embroidery_enabled, dtf_enabled,
          category_id, store_category_override_id,
          display_name, display_color, primary_image_url, primary_image_type, extra_image_urls, extra_image_types,
          internal_notes, allowed_colors,
          catalog_styles(id, style_id, style_name, brand_name, style_image, description),
          team_store_categories(id, name)
        `)
        .eq("id", productId!)
        .eq("team_store_id", store.id)
        .maybeSingle();
      if (error) throw error;
      return data as StoreProduct | null;
    },
    enabled: !!productId,
  });

  const categoryOptions = visibleCategories.map((c) => ({
    id: c.globalCategoryId ?? c.id,
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    overrideId: c.overrideId,
    isCustom: c.isCustom,
  }));

  // Preserve list state when going back
  const backParams = new URLSearchParams();
  const listSearch = searchParams.get("ls");
  const listCategory = searchParams.get("lc");
  const listStatus = searchParams.get("lst");
  if (listSearch) backParams.set("search", listSearch);
  if (listCategory) backParams.set("category", listCategory);
  if (listStatus) backParams.set("status", listStatus);
  const backQuery = backParams.toString();
  const backUrl = `/admin/team-stores/${store.id}/products${backQuery ? `?${backQuery}` : ""}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Products
        </Button>
        <p className="text-sm text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const style = item.catalog_styles;
  const displayName = item.display_name || style?.style_name || `Style #${item.style_id}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" /> Products
        </Button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {getProductImage(item) && (
            <img
              src={getProductImage(item)}
              alt=""
              className="w-10 h-10 object-contain rounded border bg-muted p-0.5 shrink-0"
              onError={handleImageError}
            />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{style?.brand_name} · #{style?.style_id}</p>
          </div>
          <Badge variant={item.active ? "default" : "secondary"} className="shrink-0">
            {item.active ? "Active" : "Hidden"}
          </Badge>
        </div>
      </div>

      {/* Full-width tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto py-0 overflow-x-auto">
          {["Overview", "Pricing", "Images", "Logos", "Messages", "Variants", "Personalization", "Decoration"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent py-3 px-4 whitespace-nowrap"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="pt-6">
          <TabsContent value="overview" className="m-0">
            <ProductEditorOverviewTab item={item} storeId={store.id} categories={categoryOptions} />
          </TabsContent>
          <TabsContent value="pricing" className="m-0">
            <ProductEditorPricingTab item={item} storeId={store.id} />
          </TabsContent>
          <TabsContent value="images" className="m-0">
            <div className="space-y-8">
              <ProductOverridesPanel item={item} storeId={store.id} onDirty={() => {}} />
              <div className="border-t pt-6">
                <ProductVariantImagesTab item={item} storeId={store.id} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="logos" className="m-0">
            <div className="max-w-2xl">
              <ProductLogosTab item={item} storeId={store.id} />
            </div>
          </TabsContent>
          <TabsContent value="messages" className="m-0">
            <ProductMessagesPanel storeId={store.id} productId={item.id} />
          </TabsContent>
          <TabsContent value="variants" className="m-0">
            <ProductVariantsTab item={item} storeId={store.id} />
          </TabsContent>
          <TabsContent value="personalization" className="m-0">
            <ProductPersonalizationTab item={item} storeId={store.id} />
          </TabsContent>
          <TabsContent value="decoration" className="m-0">
            <ProductDecorationPricingTab item={item} storeId={store.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
