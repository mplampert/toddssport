import { Check } from "lucide-react";

const coachBenefits = [
  "No money handling or paper forms.",
  "One link for all orders.",
  "Set open/close dates and fundraising amounts.",
  "Real-time order tracking and reports.",
  "Professional storefront with your branding.",
];

const parentBenefits = [
  "Simple online ordering, shipped direct or to the team.",
  "Access to name-brand gear customized for your program.",
  "Sizes and styles for players, parents, and siblings.",
  "Secure checkout with multiple payment options.",
  "Easy re-ordering for future seasons.",
];

export function FeaturesAndBenefits() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Built for Everyone in Your Program
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Todd's Team Stores make life easier for coaches and parents alike.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Coaches & ADs Column */}
          <div className="bg-card rounded-xl border border-border p-8">
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-bold">🏈</span>
              </span>
              For Coaches & ADs
            </h3>
            <ul className="space-y-4">
              {coachBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Parents & Fans Column */}
          <div className="bg-card rounded-xl border border-border p-8">
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-bold">👨‍👩‍👧</span>
              </span>
              For Parents & Fans
            </h3>
            <ul className="space-y-4">
              {parentBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
