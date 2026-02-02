import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Printer, Scissors, Users, Gift } from "lucide-react";

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
  long_description: string | null;
  icon: string | null;
  image_url: string | null;
  order_index: number;
}

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

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .order("order_index");
      
      if (data) setServices(data);
    };

    fetchServices();
  }, []);


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-navy py-20 md:py-28">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground text-center mb-4">
              Our Services
            </h1>
            <p className="text-xl text-primary-foreground/80 text-center max-w-2xl mx-auto">
              From screen printing to complete team packages, we have everything you need to outfit your organization.
            </p>
          </div>
        </section>

        {/* Services List */}
        <section className="section-padding">
          <div className="container mx-auto px-4">
            <div className="space-y-16 md:space-y-24">
              {services.map((service, index) => {
                const IconComponent = iconMap[service.icon || "Printer"] || Printer;
                const isReversed = index % 2 === 1;
                // Use database image_url if available, otherwise use local image
                const imageUrl = service.image_url || localImages[service.slug] || screenPrintingImg;

                return (
                  <div 
                    key={service.id}
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${isReversed ? "lg:flex-row-reverse" : ""}`}
                  >
                    {/* Image */}
                    <div className={`${isReversed ? "lg:order-2" : ""}`}>
                      <div className="rounded-xl overflow-hidden shadow-xl">
                        <img 
                          src={imageUrl}
                          alt={service.name}
                          className="w-full h-64 md:h-80 lg:h-96 object-cover"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`${isReversed ? "lg:order-1" : ""}`}>
                      <div className="service-card-icon mb-4">
                        <IconComponent className="w-7 h-7" />
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                        {service.name}
                      </h2>
                      <p className="text-lg text-muted-foreground mb-6">
                        {service.long_description || service.short_description}
                      </p>
                      <Button asChild className="btn-cta">
                        <Link to="/contact">Get a Quote for {service.name}</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-accent py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-accent-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-accent-foreground/90 mb-8 max-w-xl mx-auto">
              Let us help you create the perfect custom apparel for your team or organization.
            </p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-navy-light">
              <Link to="/contact">Request a Free Quote</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
