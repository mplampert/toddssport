import { Button } from "@/components/ui/button";

interface UniformsHeroProps {
  headline?: string;
  subheadline?: string;
  backgroundImage?: string;
}

export function UniformsHero({
  headline = "Custom Team Uniforms for Every Sport",
  subheadline = "Todd's Sporting Goods outfits schools, clubs, recreational leagues, and travel teams with high-quality uniforms and gear—designed to fit your brand, budget, and timeline.",
  backgroundImage,
}: UniformsHeroProps) {
  const scrollToGrid = () => {
    const gridSection = document.getElementById("uniforms-grid");
    if (gridSection) {
      gridSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToForm = () => {
    const formSection = document.getElementById("uniforms-cta");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center">
      {/* Background Image or Gradient */}
      {backgroundImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-dark via-charcoal to-charcoal-light" />
      )}
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/85 to-charcoal/70" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-primary-foreground mb-6 leading-[1.1] tracking-tight">
            {headline.split(" ").slice(0, 3).join(" ")}
            <span className="block text-accent">{headline.split(" ").slice(3).join(" ")}</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              Request Uniform Quote
            </Button>
            <Button 
              onClick={scrollToGrid}
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
            >
              Browse Sports
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
