interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

const defaultBrands: Brand[] = [
  { id: "1", name: "Nike", logo_url: null },
  { id: "2", name: "Under Armour", logo_url: null },
  { id: "3", name: "Adidas", logo_url: null },
  { id: "4", name: "Russell Athletic", logo_url: null },
  { id: "5", name: "Augusta Sportswear", logo_url: null },
  { id: "6", name: "Badger Sport", logo_url: null },
];

interface BrandsBarProps {
  brands?: Brand[];
}

export function BrandsBar({ brands = defaultBrands }: BrandsBarProps) {
  return (
    <section className="py-12 md:py-16 bg-secondary border-y border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-lg font-semibold text-muted-foreground mb-8 uppercase tracking-wider">
          Brands We Offer
        </h2>
        
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {brands.map((brand) => (
            <div 
              key={brand.id}
              className="flex items-center justify-center"
            >
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="brand-logo"
                />
              ) : (
                <div className="px-6 py-3 bg-muted rounded-lg">
                  <span className="font-bold text-lg text-muted-foreground">{brand.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
