import { Button } from "@/components/ui/button";
import heroImage from "@/assets/promo-hero.jpg";

export function PromoHero() {
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
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/75 to-navy/50" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-4">
            Promotional Products • Branded Merchandise
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Branded Products That Keep Your Logo Everywhere
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
            From everyday essentials to event-worthy gifts, Todd's Sporting Goods sources and decorates promotional products that your employees, customers, and fans actually keep and use.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToForm}
              size="lg" 
              className="btn-cta text-lg px-8"
            >
              Get Promo Product Ideas
            </Button>
            <Button 
              onClick={scrollToForm}
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-navy text-lg px-8"
            >
              Request a Quote
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
