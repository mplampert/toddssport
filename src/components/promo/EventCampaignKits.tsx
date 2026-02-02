import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Presentation, Trophy, Rocket, Users } from "lucide-react";
import heroImage from "@/assets/promo-hero.jpg";

const kitTypes = [
  {
    icon: Presentation,
    title: "Trade Show Kit",
    description: "Table cover, banner, giveaways, and staff apparel.",
  },
  {
    icon: Trophy,
    title: "Tournament Kit",
    description: "Coach polos, staff lanyards, signage, and awards.",
  },
  {
    icon: Rocket,
    title: "Launch Kit",
    description: "Branded apparel, desk swag, and launch-day mailers.",
  },
  {
    icon: Users,
    title: "Volunteer / Staff Kit",
    description: "Tees, name badges, and quick-ID gear.",
  },
];

const includedFeatures = [
  "Product sourcing and decoration.",
  "Pre-packed kits by person or location.",
  "Bulk shipment or individual drop-ship.",
];

export function EventCampaignKits() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
          Event & Campaign Kits, Done for You.
        </h2>
        <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
          Dialed-in kits for trade shows, conferences, tournaments, and launches—packed, kitted, and ready to ship.
        </p>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-12">
          {/* Left Column - Content */}
          <div>
            {/* Kit Types Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {kitTypes.map((kit, index) => (
                <Card key={index} className="border border-border card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <kit.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h4 className="font-semibold text-foreground">{kit.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{kit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* What's Included */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">What's included in every kit:</h3>
              <ul className="space-y-3">
                {includedFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timing Note */}
            <p className="text-sm text-muted-foreground italic mb-8">
              Standard timelines for most programs, with rush options when possible.
            </p>

            {/* CTA Button */}
            <Button onClick={scrollToForm} size="lg" className="btn-cta">
              Explore event kits
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <img
              src={heroImage}
              alt="Event and campaign kits"
              className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
