import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Check, ClipboardList } from "lucide-react";
import { useInquiryCart } from "@/hooks/useInquiryCart";
import { openInquiryDrawer } from "@/components/catalog/InquiryCartDrawer";
import { toast } from "sonner";
import { getCategoryGroupLabel } from "@/lib/catalogCategories";

export function PopularProductsRow() {
  const { addItem, isInCart } = useInquiryCart();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["catalog-popular-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_products")
        .select(
          "id, name, category, image_url, source_sku, style_code, brand_id, is_featured, popularity_score, brands!master_products_brand_id_fkey(name)"
        )
        .eq("active", true)
        .or("is_featured.eq.true,popularity_score.gt.0")
        .order("popularity_score", { ascending: false })
        .order("name")
        .limit(12);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        image_url: p.image_url,
        source_sku: p.source_sku,
        style_code: p.style_code,
        brand_name: p.brands?.name || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Popular Right Now</h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-44 space-y-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Popular Right Now</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {products.map((product) => {
            const inCart = isInCart(product.id);
            return (
              <div
                key={product.id}
                className="flex-shrink-0 w-44 group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <Link to={`/catalog/${product.id}`} className="flex flex-col flex-grow">
                  <div className="relative aspect-square bg-secondary/30 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 flex-grow flex flex-col">
                    {product.brand_name && (
                      <p className="text-[9px] uppercase tracking-wider text-accent font-semibold mb-0.5">
                        {product.brand_name}
                      </p>
                    )}
                    <h3 className="text-xs font-semibold text-foreground line-clamp-2 mb-0.5 group-hover:text-accent transition-colors">
                      {product.name}
                    </h3>
                    {(product.style_code || product.source_sku) && (
                      <p className="text-[10px] text-muted-foreground mt-auto">
                        #{product.style_code || product.source_sku}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="px-2.5 pb-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!inCart) {
                        addItem({
                          productId: product.id,
                          name: product.name,
                          brand: product.brand_name || "",
                          sourceSku: product.source_sku,
                          color: null,
                          imageUrl: product.image_url,
                          productUrl: `/catalog/${product.id}`,
                        });
                        toast.success(`Added "${product.name}" to inquiry list`);
                      } else {
                        openInquiryDrawer();
                      }
                    }}
                    className={`w-full flex items-center justify-center gap-1 text-[10px] font-medium py-1 px-2 rounded-md transition-colors ${
                      inCart
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {inCart ? (
                      <><Check className="w-2.5 h-2.5" /> In List</>
                    ) : (
                      <><ClipboardList className="w-2.5 h-2.5" /> Inquire</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
