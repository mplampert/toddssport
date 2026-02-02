import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import fanwearHeroImg from "@/assets/fanwear-hero.jpg";

export function FanwearHero() {
  const scrollToForm = () => {
    const formSection = document.getElementById("fanwear-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${fanwearHeroImg})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/80 to-charcoal/60" />
      
      {/* Overlay Text Badge */}
      <div className="absolute top-8 right-8 hidden lg:block">
        <div className="bg-accent/90 text-white px-6 py-3 rounded-full font-bold text-sm tracking-wide">
          Hoodies • Tees • Hats • Accessories
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-primary-foreground mb-6 leading-[1.1] tracking-tight">
            Fanwear & Spirit Wear
            <span className="block text-accent">for Your Entire Community</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            Outfit parents, students, alumni, and fans with custom hoodies, tees, and merchandise that turn every game into a sea of your colors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              Request a Fanwear Store
            </Button>
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
            >
              <Link to="/find-your-rep">Talk to a Rep</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
