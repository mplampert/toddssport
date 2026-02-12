import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Package, Check, ClipboardList } from "lucide-react";
import { useInquiryCart } from "@/hooks/useInquiryCart";
import { openInquiryDrawer } from "@/components/catalog/InquiryCartDrawer";
import { toast } from "sonner";
import { getCategoryGroupLabel } from "@/lib/catalogCategories";

export interface CatalogProductData {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  source_sku: string | null;
  brand_name: string | null;
  style_code: string | null;
}

export interface ProductColorDot {
  color_name: string;
  color1: string | null;
  swatch_image_url: string | null;
}

interface CatalogProductCardProps {
  product: CatalogProductData;
  colorDots?: ProductColorDot[];
}

export function CatalogProductCard({ product, colorDots = [] }: CatalogProductCardProps) {
  const { addItem, isInCart } = useInquiryCart();
  const inCart = isInCart(product.id);

  const visibleDots = colorDots.slice(0, 6);
  const extraCount = colorDots.length - 6;

  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <Link to={`/catalog/${product.id}`} className="flex flex-col flex-grow">
        {/* Image */}
        <div className="relative aspect-square bg-secondary/30 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
          {product.category && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 text-[10px] bg-background/90 backdrop-blur-sm"
            >
              {getCategoryGroupLabel(product.category)}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex-grow flex flex-col">
          {product.brand_name && (
            <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-0.5">
              {product.brand_name}
            </p>
          )}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>
          {(product.style_code || product.source_sku) && (
            <p className="text-[11px] text-muted-foreground">
              #{product.style_code || product.source_sku}
            </p>
          )}

          {/* Color dots */}
          {visibleDots.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {visibleDots.map((dot) => (
                <span
                  key={dot.color_name}
                  title={dot.color_name}
                  className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                  style={{
                    backgroundColor: dot.color1 || "#ccc",
                    backgroundImage: dot.swatch_image_url
                      ? `url(${dot.swatch_image_url})`
                      : undefined,
                    backgroundSize: "cover",
                  }}
                />
              ))}
              {extraCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Inquiry button */}
      <div className="px-3 pb-3">
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
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md transition-colors ${
            inCart
              ? "bg-accent/10 text-accent border border-accent/30"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {inCart ? (
            <>
              <Check className="w-3 h-3" /> In Inquiry List
            </>
          ) : (
            <>
              <ClipboardList className="w-3 h-3" /> Add to Inquiry
            </>
          )}
        </button>
      </div>
    </div>
  );
}
