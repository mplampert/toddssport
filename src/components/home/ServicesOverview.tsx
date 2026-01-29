import { Link } from "react-router-dom";
import { Printer, Scissors, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Service {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  icon: string;
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
            return (
              <div 
                key={service.id}
                className="service-card"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="service-card-icon">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.short_description}</p>
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
