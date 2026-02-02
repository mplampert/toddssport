import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import heroImage from "@/assets/promo-hero.jpg";

const bullets = [
  "Curated for your brand, audience, and budget.",
  "On-demand stores or one-time drops.",
  "Decorated, kitted, and shipped for you.",
];

export function PromoHeroNew() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--charcoal))]/95 via-[hsl(var(--charcoal))]/85 to-[hsl(var(--charcoal))]/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Promotional Products That Actually Get Used.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
            From trade shows to onboarding kits, we handle the sourcing, decoration, and fulfillment so your team doesn't have to.
          </p>

          {/* Bullets */}
          <ul className="space-y-3 mb-8">
            {bullets.map((bullet, index) => (
              <li key={index} className="flex items-center gap-3 text-white/90">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <Button
            onClick={scrollToForm}
            size="lg"
            className="btn-cta text-lg px-8"
          >
            Schedule a 15-Minute Call
          </Button>
        </div>
      </div>
    </section>
  );
}
