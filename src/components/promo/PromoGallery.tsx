import heroImage from "@/assets/promo-hero.jpg";
import giftBoxImage from "@/assets/promo-gift-box.jpg";
import promoProductsImg from "@/assets/promo-products.jpg";

const galleryItems = [
  {
    image: heroImage,
    caption: "Curated desk essentials kit",
  },
  {
    image: giftBoxImage,
    caption: "Welcome kit with apparel, drinkware, and tech",
  },
  {
    image: promoProductsImg,
    caption: "Event-ready drinkware lineup",
  },
];

export function PromoGallery() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            See What's Possible
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From curated gift boxes to full event kits—here's a glimpse of what we create.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {galleryItems.map((item, index) => (
            <div key={index} className="group relative overflow-hidden rounded-xl shadow-lg">
              <img 
                src={item.image}
                alt={item.caption}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                <p className="text-white font-medium p-4">
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
