import { Button } from "@/components/ui/button";
import heroMainImg from "@/assets/hero-main.jpg";

export function HeroSection() {
  const scrollToQuote = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToRep = () => {
    const repSection = document.getElementById("find-rep");
    if (repSection) {
      repSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroMainImg})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/95 via-navy/85 to-navy/70" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-primary-foreground mb-6 leading-[1.1] tracking-tight">
            Your Program Demands More.
            <span className="block text-accent">Todd's Delivers.</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            Custom uniforms, spirit wear, and branded gear for schools, clubs, and businesses—handled by a dedicated Todd's rep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToQuote}
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              Get a Team Quote
            </Button>
            <Button 
              onClick={scrollToRep}
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
            >
              Find Your Rep
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
