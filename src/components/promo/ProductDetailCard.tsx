import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Palette, 
  DollarSign, 
  Truck, 
  Image as ImageIcon, 
  Printer,
  Tag,
  Clock,
  Ruler,
  Info
} from "lucide-react";
import type { ToddProductFull } from "@/lib/promo-api";

interface ProductDetailCardProps {
  product: ToddProductFull;
  className?: string;
}

export function ProductDetailCard({ product, className = "" }: ProductDetailCardProps) {
  const lowestPrice = product.pricing.priceBreaks.length > 0
    ? Math.min(...product.pricing.priceBreaks.map(p => p.unitPrice))
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Product Images */}
        <div className="lg:w-1/2">
          <ProductImages images={product.images} name={product.name} />
        </div>

        {/* Product Info */}
        <div className="lg:w-1/2 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="uppercase">
                {product.supplier}
              </Badge>
              <Badge variant="secondary">{product.itemNumber}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            {product.shortName && (
              <p className="text-muted-foreground">{product.shortName}</p>
            )}
          </div>

          {lowestPrice && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                ${lowestPrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground">starting price</span>
            </div>
          )}

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-4">
            {product.brand && (
              <QuickInfoItem icon={Tag} label="Brand" value={product.brand} />
            )}
            {product.category && (
              <QuickInfoItem icon={Package} label="Category" value={product.category} />
            )}
            {product.gender && (
              <QuickInfoItem icon={Info} label="Gender" value={product.gender} />
            )}
            {product.fit && (
              <QuickInfoItem icon={Ruler} label="Fit" value={product.fit} />
            )}
          </div>

          {/* Colors Preview */}
          {product.colors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Available Colors ({product.colors.length})</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.slice(0, 8).map((color) => (
                  <ColorSwatch key={color.code} color={color} />
                ))}
                {product.colors.length > 8 && (
                  <Badge variant="outline">+{product.colors.length - 8} more</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Details */}
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="specs" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Specs</span>
          </TabsTrigger>
          <TabsTrigger value="imprint" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprint</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Shipping</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-4">
          <PricingSection pricing={product.pricing} />
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <SpecsSection product={product} />
        </TabsContent>

        <TabsContent value="imprint" className="mt-4">
          <ImprintSection imprint={product.imprint} />
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <ShippingSection leadTime={product.leadTime} shipping={product.shipping} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components

function ProductImages({ images, name }: { images: ToddProductFull['images']; name: string }) {
  const primaryImage = images.find(img => img.type === 'front') || images[0];
  const otherImages = images.filter(img => img !== primaryImage).slice(0, 4);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <ImageIcon className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
        <img
          src={primaryImage.url}
          alt={name}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
      </div>
      {otherImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {otherImages.map((img, idx) => (
            <div key={idx} className="aspect-square bg-muted rounded overflow-hidden">
              <img
                src={img.url}
                alt={`${name} - ${img.type}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickInfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: ToddProductFull['colors'][0] }) {
  return (
    <div
      className="group relative"
      title={color.name}
    >
      {color.imageUrl ? (
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors">
          <img
            src={color.imageUrl}
            alt={color.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full border-2 border-border bg-muted flex items-center justify-center">
          <Palette className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function PricingSection({ pricing }: { pricing: ToddProductFull['pricing'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pricing.baseDecoration && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">{pricing.baseDecoration}</p>
          </div>
        )}

        {pricing.priceBreaks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Quantity</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {pricing.priceBreaks.map((pb, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 px-3">{pb.minQty}+</td>
                    <td className="py-2 px-3 text-right font-medium">
                      ${pb.unitPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No pricing information available.</p>
        )}

        {pricing.extraCharges.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Additional Charges</h4>
              <ul className="space-y-1">
                {pricing.extraCharges.map((charge, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span>{charge.type}</span>
                    <span className="font-medium">${charge.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Currency: {pricing.currency}
        </p>
      </CardContent>
    </Card>
  );
}

function SpecsSection({ product }: { product: ToddProductFull }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Specifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Features */}
        {product.features.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Features</h4>
            <ul className="list-disc list-inside space-y-1">
              {product.features.map((feature, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Fabric */}
        {product.fabric && (
          <div>
            <h4 className="font-medium mb-1">Fabric</h4>
            <p className="text-sm text-muted-foreground">{product.fabric}</p>
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Available Sizes</h4>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <Badge key={size} variant="outline">{size}</Badge>
              ))}
            </div>
            {product.sizeNotes && (
              <p className="text-xs text-muted-foreground mt-2">{product.sizeNotes}</p>
            )}
          </div>
        )}

        {/* Colors Full List */}
        {product.colors.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Colors ({product.colors.length})</h4>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <Badge key={color.code} variant="secondary">
                  {color.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {product.keywords.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-1">
              {product.keywords.map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Category Info */}
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          {product.category && (
            <div>
              <span className="text-muted-foreground">Category:</span>{' '}
              <span className="font-medium">{product.category}</span>
            </div>
          )}
          {product.subCategory && (
            <div>
              <span className="text-muted-foreground">Sub-category:</span>{' '}
              <span className="font-medium">{product.subCategory}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ImprintSection({ imprint }: { imprint: ToddProductFull['imprint'] }) {
  const hasImprintInfo = imprint.method || imprint.includedLocation || imprint.locations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Imprint & Decoration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasImprintInfo ? (
          <p className="text-muted-foreground">No imprint information available.</p>
        ) : (
          <>
            {imprint.method && (
              <div>
                <h4 className="font-medium mb-1">Decoration Method</h4>
                <p className="text-sm text-muted-foreground">{imprint.method}</p>
              </div>
            )}

            {imprint.includedLocation && (
              <div>
                <h4 className="font-medium mb-1">Included Location</h4>
                <Badge variant="secondary">{imprint.includedLocation}</Badge>
              </div>
            )}

            {imprint.locations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Available Locations</h4>
                <div className="space-y-2">
                  {imprint.locations.map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">{loc.name}</span>
                      {loc.maxArea && (
                        <span className="text-sm text-muted-foreground">{loc.maxArea}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imprint.maxColors && (
              <div>
                <h4 className="font-medium mb-1">Maximum Colors</h4>
                <p className="text-sm text-muted-foreground">{imprint.maxColors} colors</p>
              </div>
            )}

            {imprint.tapeCharge && (
              <div className="p-3 bg-accent rounded-lg">
                <h4 className="font-medium mb-1">Tape Charge</h4>
                <p className="text-sm">
                  ${imprint.tapeCharge.amount?.toFixed(2)} {imprint.tapeCharge.currency}
                  {imprint.tapeCharge.waivedAtQty && (
                    <span className="text-muted-foreground">
                      {' '}(waived at {imprint.tapeCharge.waivedAtQty}+ units)
                    </span>
                  )}
                </p>
                {imprint.tapeCharge.note && (
                  <p className="text-xs text-muted-foreground mt-1">{imprint.tapeCharge.note}</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ShippingSection({ 
  leadTime, 
  shipping 
}: { 
  leadTime: ToddProductFull['leadTime']; 
  shipping: ToddProductFull['shipping'];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Lead Time & Shipping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Standard Lead Time</span>
            </div>
            <p className="text-2xl font-bold">
              {leadTime.standardDays ? `${leadTime.standardDays} days` : 'Contact for details'}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rush Available</span>
            </div>
            <p className="text-2xl font-bold">
              {leadTime.rushAvailable ? (
                <Badge className="bg-primary text-primary-foreground">Yes</Badge>
              ) : (
                <Badge variant="secondary">No</Badge>
              )}
            </p>
          </div>
        </div>

        {/* Shipping Info */}
        {(shipping.origin || shipping.cartonInfo) && (
          <>
            <Separator />
            <div className="space-y-2">
              {shipping.origin && (
                <div>
                  <span className="text-sm text-muted-foreground">Ships from:</span>{' '}
                  <span className="font-medium">{shipping.origin}</span>
                </div>
              )}
              {shipping.cartonInfo && (
                <div>
                  <span className="text-sm text-muted-foreground">Carton Info:</span>{' '}
                  <span className="font-medium">{shipping.cartonInfo}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductDetailCard;
