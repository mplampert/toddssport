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

interface BrandsStripProps {
  brands?: Brand[];
}

export function BrandsStrip({ brands = defaultBrands }: BrandsStripProps) {
  return (
    <section className="py-12 md:py-16 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-sm font-semibold text-muted-foreground mb-8 uppercase tracking-widest">
          Brands We Offer
        </h2>
        
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 lg:gap-8">
          {brands.map((brand) => (
            <div 
              key={brand.id}
              className="flex items-center justify-center"
            >
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="h-10 md:h-12 w-auto grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              ) : (
                <div className="px-4 md:px-6 py-2 md:py-3 bg-navy/5 rounded-md border border-navy/10 hover:bg-navy hover:border-navy transition-all duration-300 group cursor-default">
                  <span className="font-bold text-sm md:text-base text-navy/70 group-hover:text-primary-foreground transition-colors whitespace-nowrap">
                    {brand.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-6">
          Plus many more athletic and casual brands available
        </p>
      </div>
    </section>
  );
}
