import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroMainImg from "@/assets/hero-main.jpg";

export function HeroSection() {
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
            Custom team stores, uniforms, spirit wear, and branded gear for schools, clubs, and businesses — with built-in fundraising and direct-to-home shipping.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              asChild
              size="lg"
              className="btn-cta text-lg px-8 py-6 font-bold"
            >
              <Link to="/contact">Request a Team Store</Link>
            </Button>
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground/10 border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground font-semibold"
            >
              <Link to="/webstores">Find My Store</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
