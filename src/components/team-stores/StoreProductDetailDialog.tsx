import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    notes: string | null;
    price_override: number | null;
    catalog_styles: {
      style_name: string;
      brand_name: string;
      style_image: string | null;
      description: string | null;
    } | null;
  } | null;
}

export function StoreProductDetailDialog({ open, onOpenChange, product }: Props) {
  if (!product) return null;
  const style = product.catalog_styles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{style?.style_name ?? "Product"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {style?.style_image && (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-6">
              <img
                src={style.style_image}
                alt={style.style_name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            {style?.brand_name && (
              <Badge variant="secondary">{style.brand_name}</Badge>
            )}

            {product.price_override != null && (
              <p className="text-2xl font-bold text-foreground">
                ${Number(product.price_override).toFixed(2)}
              </p>
            )}

            {(product.notes || style?.description) && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.notes || style?.description}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
