import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useEffectiveCategories } from "@/components/admin/team-stores/StoreCategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductLogosTab } from "@/components/admin/team-stores/ProductLogosTab";
import { ProductVariantsTab } from "@/components/admin/team-stores/ProductVariantsTab";
import { ProductMessagesPanel } from "@/components/admin/team-stores/ProductMessagesPanel";
import { ProductVariantImagesTab } from "@/components/admin/team-stores/ProductVariantImagesTab";
import { ProductEditorOverviewTab } from "@/components/admin/team-stores/ProductEditorOverviewTab";

import { ProductPersonalizationTab } from "@/components/admin/team-stores/ProductPersonalizationTab";
import { ProductDecorationPricingTab } from "@/components/admin/team-stores/ProductDecorationPricingTab";
import { getProductImage, handleImageError } from "@/lib/productImages";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import type { StoreProduct } from "@/components/admin/team-stores/ProductListPane";

export default function StoreProductEditor() {
  const { store } = useTeamStoreContext();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

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
          team_roster_id, number_lock_rule,
          catalog_styles(id, style_id, style_name, brand_name, style_image, description, part_number),
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

  // Always fetch from SS Activewear to get rich product info
  // Use catalog_styles.style_id (the real SS styleID) when available, otherwise item.style_id
  const ssLookupId = item?.catalog_styles?.style_id ?? item?.style_id;
  const { data: ssStyle } = useQuery<SSStyle | null>({
    queryKey: ["ss-style-info", ssLookupId],
    queryFn: async () => {
      const styles = await getStyles({ style: String(ssLookupId) });
      return styles?.[0] ?? null;
    },
    enabled: !!ssLookupId,
    staleTime: 1000 * 60 * 30,
  });

  const categoryOptions = visibleCategories.map((c) => ({
    id: c.globalCategoryId ?? c.id,
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    overrideId: c.overrideId,
    isCustom: c.isCustom,
  }));

  const toggleActiveMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from("team_store_products")
        .update({ active })
        .eq("id", productId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", productId] });
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
      toast.success(item?.active ? "Product hidden" : "Product activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
  // Prefer SS name when catalog style_name is just a number (SKU stored as name)
  // Treat catalog name as a SKU if it's a short alphanumeric code (e.g. "5000B", "18000", "G200")
  const catalogNameIsSku = style?.style_name && /^\d+[A-Za-z]?$|^[A-Za-z]\d+/.test(style.style_name);
  const resolvedName = item.display_name || ssStyle?.styleName || (!catalogNameIsSku ? style?.style_name : null) || `Style #${item.style_id}`;
  const resolvedBrand = ssStyle?.brandName || style?.brand_name;
  const resolvedSku = style?.style_name || ssStyle?.partNumber || style?.style_id || ssStyle?.styleID;
  const resolvedImage = getProductImage(item) || ssStyle?.styleImage;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="shrink-0 mt-1">
          <ArrowLeft className="w-4 h-4 mr-1" /> Products
        </Button>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {resolvedImage && (
            <img
              src={resolvedImage}
              alt=""
              className="w-12 h-12 object-contain rounded border bg-muted p-0.5 shrink-0"
              onError={handleImageError}
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground truncate">{resolvedName}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {resolvedSku && <span>SKU: {resolvedSku}</span>}
              {resolvedBrand && <span>Vendor: {resolvedBrand}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span className="text-xs text-muted-foreground">{item.active ? "Active" : "Hidden"}</span>
            <Switch
              checked={item.active}
              onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
            />
          </div>
        </div>
      </div>

      {/* Full-width tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none px-0 h-auto py-0 overflow-x-auto">
          {["Overview", "Logos", "Messages", "Variants", "Personalization", "Decoration"].map((tab) => (
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
