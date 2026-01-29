import { Package, Gift, Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: Package,
    title: "Branded Merchandise",
    description: "Build memorable touchpoints with high-impact branded merchandise, curated for your audience and brand style.",
    cta: "Explore branded merchandise",
  },
  {
    icon: Gift,
    title: "Employee & Customer Gifting",
    description: "Welcome kits, thank-you gifts, and seasonal campaigns that make employees and customers feel valued.",
    cta: "Explore gifting programs",
  },
  {
    icon: Boxes,
    title: "Event & Campaign Kits",
    description: "Dialed-in kits for trade shows, conferences, tournaments, and launches—packed, kitted, and ready to ship.",
    cta: "Explore event kits",
  },
];

export function WhatWeDo() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            What We Do with Promo
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three ways we help organizations build memorable branded experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <Card 
              key={index} 
              className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={scrollToForm}
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/20 transition-colors">
                  <pillar.icon className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {pillar.description}
                </p>
                <span className="text-accent font-semibold hover:underline">
                  {pillar.cta} →
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
