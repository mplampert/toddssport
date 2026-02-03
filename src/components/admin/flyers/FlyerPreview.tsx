import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toddsLogo from "@/assets/todds-logo.png";

interface ProductForFlyer {
  imageUrl: string;
  title: string;
  description: string;
  priceLine: string;
}

interface FlyerPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  notesCta: string;
  products: ProductForFlyer[];
}

export function FlyerPreview({ open, onOpenChange, clientName, notesCta, products }: FlyerPreviewProps) {
  const validProducts = products.filter(p => p.title.trim());
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Flyer Preview</DialogTitle>
        </DialogHeader>
        
        {/* Scaled flyer preview */}
        <div 
          className="bg-white text-black rounded-lg shadow-lg mx-auto"
          style={{ 
            width: '100%',
            maxWidth: '612px', // 8.5" at 72dpi
            aspectRatio: '8.5 / 11',
            padding: '24px',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3 mb-4">
            <img 
              src={toddsLogo} 
              alt="Todd's Logo" 
              className="h-10 object-contain"
            />
            {clientName && (
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Prepared for</p>
                <p className="text-lg font-semibold text-gray-800">{clientName}</p>
              </div>
            )}
          </div>
          
          {/* Products Grid */}
          <div 
            className="grid gap-4 mb-4"
            style={{
              gridTemplateColumns: validProducts.length <= 2 ? '1fr 1fr' : 'repeat(2, 1fr)',
            }}
          >
            {validProducts.map((product, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-3 flex flex-col"
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No Image</span>
                  )}
                </div>
                
                {/* Product Info */}
                <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                  {product.title || 'Product Title'}
                </h3>
                {product.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
                {product.priceLine && (
                  <p className="text-sm font-bold text-primary mt-auto">
                    {product.priceLine}
                  </p>
                )}
              </div>
            ))}
            
            {/* Empty state placeholders */}
            {validProducts.length === 0 && (
              <>
                <div className="border border-dashed border-gray-300 rounded-lg p-3 aspect-square flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center">Add products to preview</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-lg p-3 aspect-square flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center">Add products to preview</span>
                </div>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t-2 border-gray-200 pt-3 mt-auto">
            {notesCta && (
              <p className="text-center text-sm text-gray-700 mb-2">
                {notesCta}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>www.toddssportinggoods.com</span>
              <span>(507) 625-5643</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          This is a preview. The final PDF may vary slightly in appearance.
        </p>
      </DialogContent>
    </Dialog>
  );
}
