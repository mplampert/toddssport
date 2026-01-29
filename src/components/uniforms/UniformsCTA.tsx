import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface UniformsCTAProps {
  quoteFormUrl?: string;
}

export function UniformsCTA({ quoteFormUrl }: UniformsCTAProps) {
  const handleClick = () => {
    if (quoteFormUrl) {
      window.open(quoteFormUrl, "_blank");
    } else {
      // Scroll to home quote form as fallback
      window.location.href = "/#quote-form";
    }
  };

  const benefits = [
    "Top brands: Nike, Under Armour, Adidas, and more",
    "Multiple decoration options: screen print, embroidery, sublimation",
    "Youth through adult sizing with team pricing",
    "Dedicated rep to guide you from design to delivery",
  ];

  return (
    <section id="uniforms-cta" className="py-16 md:py-24 bg-charcoal">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Need Uniforms for Your Program?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Whether you're outfitting a rec league, school team, or travel club, we'll help you 
            find the right brands, fabrics, and decoration methods—and deliver on your timeline.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-primary-foreground/90 text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleClick}
            size="lg"
            className="btn-cta text-lg px-10 py-6 font-bold"
          >
            Request Uniform Quote
          </Button>

          <p className="text-primary-foreground/60 text-sm mt-4">
            Free quotes • No obligation • Fast turnaround
          </p>
        </div>
      </div>
    </section>
  );
}
