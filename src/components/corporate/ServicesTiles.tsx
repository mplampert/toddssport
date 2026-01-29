import { Palette, Store, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Palette,
    title: "Creative & Brand Support",
    description: "Need help with logo files, brand updates, or new artwork? Our team can assist with design tweaks, mockups, and full collection concepts.",
  },
  {
    icon: Store,
    title: "Company Web Stores",
    description: "Set up a 24/7 corporate web store so employees, franchisees, or partners can order approved gear anytime—without your team managing one-off requests.",
  },
  {
    icon: Package,
    title: "Warehousing & Fulfillment",
    description: "We can inventory and ship gear on demand, support event kits, and coordinate distribution to multiple locations.",
  },
];

export function ServicesTiles() {
  return (
    <section className="py-20 bg-navy text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Full-Service Corporate Gear Solutions
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            More than just apparel—we handle everything from design to delivery.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <service.icon className="w-8 h-8 text-navy" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {service.title}
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
