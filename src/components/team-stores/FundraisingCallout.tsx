import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export function FundraisingCallout() {
  const scrollToForm = () => {
    const formSection = document.getElementById("team-store-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 bg-accent">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <DollarSign className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Built-In Fundraising (Optional)
            </h3>
            <p className="text-white/90 text-lg">
              Add a fundraising amount to every item in your team store so your program earns money on every order without running a separate fundraiser.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="bg-white text-accent hover:bg-white/90 font-bold px-6"
            >
              Ask About Fundraising
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
