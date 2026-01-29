import fanwearHeroImg from "@/assets/fanwear-hero.jpg";
import fanwearGallery1 from "@/assets/fanwear-gallery-1.jpg";
import fanwearGallery2 from "@/assets/fanwear-gallery-2.jpg";
import fanwearGallery3 from "@/assets/fanwear-gallery-3.jpg";

const galleryImages = [
  {
    src: fanwearHeroImg,
    caption: "Student section in matching gear",
  },
  {
    src: fanwearGallery1,
    caption: "Custom hoodie collection",
  },
  {
    src: fanwearGallery2,
    caption: "Premium screen printed apparel",
  },
  {
    src: fanwearGallery3,
    caption: "Parents and fans in matching gear",
  },
];

export function FanwearGallery() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Imagine Your Stands Looking Like This
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          When your community gears up together, the energy is electric.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <div 
              key={index}
              className="relative rounded-xl overflow-hidden group aspect-[4/3]"
            >
              <img 
                src={image.src} 
                alt={image.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white text-sm font-medium">{image.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
