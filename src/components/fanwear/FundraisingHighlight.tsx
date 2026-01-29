import { Button } from "@/components/ui/button";
import { DollarSign, Check } from "lucide-react";

const benefits = [
  "Set your own fundraising amount per item.",
  "Transparent reporting on how much your program raised.",
  "No extra admin work for coaches or volunteers.",
];

export function FundraisingHighlight() {
  const scrollToForm = () => {
    const formSection = document.getElementById("fanwear-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 bg-accent">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto bg-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <div className="flex-1 text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Fanwear That Funds Your Program
              </h3>
              <p className="text-white/90 text-lg mb-6">
                Every fanwear collection can be set up with built-in fundraising so your program earns on every purchase. Choose your margin, and we'll show you projected profit per item and per sale window.
              </p>
              <ul className="space-y-3 mb-6">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-white/90">
                    <Check className="w-5 h-5 text-white flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex-shrink-0">
              <Button 
                onClick={scrollToForm}
                size="lg"
                className="bg-white text-accent hover:bg-white/90 font-bold px-8 py-6"
              >
                Ask About Fundraising Fanwear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
