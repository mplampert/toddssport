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
        
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {brands.map((brand) => (
            <div 
              key={brand.id}
              className="flex items-center justify-center"
            >
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="h-12 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              ) : (
                <div className="px-5 py-3 bg-navy/10 rounded-lg border border-navy/20 hover:bg-navy hover:border-navy transition-all duration-300 group">
                  <span className="font-bold text-base text-navy group-hover:text-primary-foreground transition-colors">{brand.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Plus many more athletic and casual brands available
        </p>
      </div>
    </section>
  );
}
