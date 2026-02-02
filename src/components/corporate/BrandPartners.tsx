export function BrandPartners() {
  const brands = [
    { name: "Nike", logo: "/brands/nike.png" },
    { name: "Under Armour", logo: "/brands/under-armour.png" },
    { name: "Adidas", logo: "/brands/adidas.png" },
    { name: "Carhartt", logo: "/brands/carhartt.svg" },
    { name: "The North Face", logo: "/brands/the-north-face.svg" },
  ];

  return (
    <section id="brand-partners" className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Co-Brand with Trusted Retail Names
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We partner with leading apparel and gear brands so your logo sits alongside names your team already loves.
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="w-24 h-16 md:w-32 md:h-20 flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
            >
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
