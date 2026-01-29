import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroBgImg from "@/assets/hero-bg.jpg";

export function ConnectCTA() {
  const scrollToQuote = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBgImg})` }}
      />
      <div className="absolute inset-0 bg-navy/90" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Ready to Gear Up Your Program?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Create an elite program with the help of your dedicated Todd's Sales Pro. 
            Get custom quotes, expert design assistance, and top-tier service.
          </p>
          <Button 
            onClick={scrollToQuote}
            size="lg"
            className="btn-cta text-lg px-10 py-6 font-bold group"
          >
            Connect Today
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
