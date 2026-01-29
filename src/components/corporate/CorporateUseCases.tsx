import { Building2, Target } from "lucide-react";

export function CorporateUseCases() {
  const perfectFor = [
    "Corporate offices and HQ",
    "Sales and customer service teams",
    "Field service and operations crews",
    "Healthcare and education staff",
    "Franchise and multi-location businesses",
  ];

  const useCorporateGearTo = [
    "Standardize employee dress and presentation",
    "Welcome new hires with onboarding kits",
    "Reward and recognize top performers",
    "Send memorable client and partner gifts",
    "Outfit teams for trade shows and events",
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Perfect For */}
          <div className="bg-navy/5 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-navy" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Perfect For</h3>
            </div>
            <ul className="space-y-3">
              {perfectFor.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Use Corporate Gear To */}
          <div className="bg-accent/5 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Use Corporate Gear To</h3>
            </div>
            <ul className="space-y-3">
              {useCorporateGearTo.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-navy rounded-full flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
