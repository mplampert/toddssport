import { Link } from "react-router-dom";
import { Printer, Scissors, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import service images
import screenPrintingImg from "@/assets/service-screen-printing.jpg";
import embroideryImg from "@/assets/service-embroidery.jpg";
import teamUniformsImg from "@/assets/service-team-uniforms.jpg";
import promoProductsImg from "@/assets/service-promo-products.jpg";

interface Service {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  icon: string;
  image_url?: string | null;
}

const defaultServices: Service[] = [
  {
    id: "1",
    slug: "screen-printing",
    name: "Screen Printing",
    short_description: "High-quality screen printing for teams, events, and businesses. Vibrant colors that last.",
    icon: "Printer",
  },
  {
    id: "2",
    slug: "embroidery",
    name: "Embroidery",
    short_description: "Professional embroidery for a polished, premium look on polos, caps, and jackets.",
    icon: "Scissors",
  },
  {
    id: "3",
    slug: "team-uniforms",
    name: "Team Uniform Packages",
    short_description: "Complete uniform solutions for youth leagues, high schools, and adult teams.",
    icon: "Users",
  },
  {
    id: "4",
    slug: "promotional-products",
    name: "Promotional Products",
    short_description: "Branded merchandise, giveaways, and promotional items to boost your brand.",
    icon: "Gift",
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Printer,
  Scissors,
  Users,
  Gift,
};

const localImages: Record<string, string> = {
  "screen-printing": screenPrintingImg,
  "embroidery": embroideryImg,
  "team-uniforms": teamUniformsImg,
  "promotional-products": promoProductsImg,
};

interface ServicesOverviewProps {
  services?: Service[];
}

export function ServicesOverview({ services = defaultServices }: ServicesOverviewProps) {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <h2 className="section-heading text-primary">Our Services</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || Printer;
            const imageUrl = service.image_url || localImages[service.slug];
            
            return (
              <div 
                key={service.id}
                className="group bg-card rounded-xl overflow-hidden border border-border card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image */}
                {imageUrl && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-5">
                  <div className="service-card-icon mb-3 w-10 h-10">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">{service.name}</h3>
                  <p className="text-muted-foreground text-sm">{service.short_description}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link to="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
