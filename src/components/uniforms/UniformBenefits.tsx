import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, Palette, Users } from "lucide-react";

const benefits = [
  {
    icon: Package,
    title: "Low Minimums",
    description: "Start with as few as 12 units. Perfect for small teams and club programs.",
  },
  {
    icon: Clock,
    title: "Fast Turnaround",
    description: "Standard 3-4 week production with 5-day and 10-day rush options available.",
  },
  {
    icon: Palette,
    title: "Free Design Help",
    description: "Our design team will help you create the perfect look—no extra charge.",
  },
  {
    icon: Users,
    title: "Full Customization",
    description: "Add player names, numbers, and your team logo to every piece.",
  },
];

export function UniformBenefits() {
  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="bg-card border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
                  <benefit.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
