import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface UniformDetailHeroProps {
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
}

export function UniformDetailHero({
  title,
  description,
  icon,
  imageUrl,
}: UniformDetailHeroProps) {
  const scrollToBuilder = () => {
    const builderSection = document.getElementById("uniform-builder");
    if (builderSection) {
      builderSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imageUrl || '/placeholder.svg'})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/85 to-charcoal/60" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <Link
          to="/uniforms"
          className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-accent mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Sports
        </Link>

        <div className="max-w-3xl">
          <div className="flex items-center gap-4 mb-4">
            {icon && <span className="text-5xl md:text-6xl">{icon}</span>}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground leading-tight">
              Custom {title}
              <span className="block text-accent">Uniforms</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={scrollToBuilder}
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              Start Designing
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
              asChild
            >
              <a href="/#quote-form">Request a Quote</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
