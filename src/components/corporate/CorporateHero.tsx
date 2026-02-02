import { Button } from "@/components/ui/button";
import heroImage from "@/assets/corporate-hero.jpg";

export function CorporateHero() {
  const scrollToForm = () => {
    const formSection = document.getElementById("corporate-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToBrands = () => {
    const brandsSection = document.getElementById("brand-partners");
    if (brandsSection) {
      brandsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/70 to-navy/50" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-4">
            Corporate Apparel • Branded Merch • Employee Gear
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Premium Corporate Apparel & Branded Merchandise
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
            Outfit your team with custom polos, outerwear, and promotional products that keep your brand front and center—on the job, at events, and everywhere in between.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToForm}
              size="lg" 
              className="btn-cta text-lg px-8"
            >
              Request Corporate Gear Quote
            </Button>
            <Button 
              onClick={scrollToBrands}
              size="lg" 
              variant="outline"
              className="border-white bg-white text-accent hover:bg-white/90 text-lg px-8"
            >
              See Brand Options
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
