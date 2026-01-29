import { Button } from "@/components/ui/button";
import teamStoreHeroImg from "@/assets/team-store-hero.jpg";

export function TeamStoreHero() {
  const scrollToForm = () => {
    const formSection = document.getElementById("team-store-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${teamStoreHeroImg})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/85 to-charcoal/70" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-primary-foreground mb-6 leading-[1.1] tracking-tight">
            Online Team Stores
            <span className="block text-accent">Built for Your Program</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            Todd's Sporting Goods creates custom online team shops so your players, parents, and fans can order gear 24/7—without coaches chasing paper forms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              Request a Team Store
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
            >
              See Sample Store
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
