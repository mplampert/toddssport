import { Shield, DollarSign, Users } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Stronger School & Club Identity",
    description: "Consistent colors and logos across hoodies, tees, and accessories make your program instantly recognizable everywhere.",
  },
  {
    icon: DollarSign,
    title: "Easy Fundraising",
    description: "Add a fundraising margin to every fanwear item so every hoodie and tee helps your program raise money.",
  },
  {
    icon: Users,
    title: "Inclusive Sizing & Styles",
    description: "Youth, adult, unisex, and fitted options so everyone—from little siblings to grandparents—can gear up.",
  },
];

export function WhyFanwearMatters() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Turn Fans into a Walking Student Section
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-lg">
          Fanwear and spirit wear do more than keep people warm in the stands—they build identity, pride, and a sense of belonging. Todd's Sporting Goods helps you create a cohesive look for your entire community, from students and parents to alumni and local businesses.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-card rounded-xl border border-border p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-6">
                <benefit.icon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-bold text-xl text-foreground mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
