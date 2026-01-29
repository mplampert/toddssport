import { Check } from "lucide-react";

const perfectFor = [
  "Schools (elementary through high school)",
  "Youth and club teams",
  "Booster clubs and PTOs",
  "Alumni associations",
  "Community and rec programs",
];

const useFanwearFor = [
  "Game days and playoffs",
  "Spirit weeks and pep rallies",
  "Tournaments and travel events",
  "Staff and volunteer appreciation",
  "Seasonal fundraising campaigns",
];

export function WhoItsFor() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Who Is Fanwear For?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Perfect For Column */}
          <div className="bg-card rounded-xl border border-border p-8">
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-xl">
                ✓
              </span>
              Perfect for:
            </h3>
            <ul className="space-y-4">
              {perfectFor.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Use Fanwear For Column */}
          <div className="bg-card rounded-xl border border-border p-8">
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-xl">
                🎯
              </span>
              Use fanwear for:
            </h3>
            <ul className="space-y-4">
              {useFanwearFor.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
