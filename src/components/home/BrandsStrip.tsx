interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

const defaultBrands: Brand[] = [
  { id: "1", name: "Nike", logo_url: "/brands/nike.png" },
  { id: "2", name: "Under Armour", logo_url: "/brands/under-armour.png" },
  { id: "3", name: "Adidas", logo_url: "/brands/adidas.png" },
  { id: "4", name: "The North Face", logo_url: "/brands/the-north-face.svg" },
  { id: "5", name: "Carhartt", logo_url: "/brands/carhartt.svg" },
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
        
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 lg:gap-14">
          {brands.map((brand) => (
            <div 
              key={brand.id}
              className="flex items-center justify-center"
            >
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="h-8 md:h-10 lg:h-12 w-auto object-contain opacity-70 hover:opacity-100 transition-all duration-300"
                />
              ) : (
                <div className="px-4 md:px-6 py-2 md:py-3 bg-charcoal/5 rounded-md border border-charcoal/10 hover:bg-charcoal hover:border-charcoal transition-all duration-300 group cursor-default">
                  <span className="font-bold text-sm md:text-base text-charcoal/70 group-hover:text-primary-foreground transition-colors whitespace-nowrap">
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
