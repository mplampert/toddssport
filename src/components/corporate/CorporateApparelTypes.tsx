import { Shirt, Cloud, HardHat, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const apparelTypes = [
  {
    icon: Shirt,
    title: "Polos & Dress Shirts",
    description: "From classic polos to button-downs, we match your dress code with comfortable, on-brand options for customer-facing staff and leadership.",
  },
  {
    icon: Cloud,
    title: "Outerwear & Layers",
    description: "Quarter-zips, fleece, jackets, and vests that keep your team warm and your logo visible year-round.",
  },
  {
    icon: HardHat,
    title: "Workwear & Safety Gear",
    description: "Durable apparel for crews, delivery teams, and field staff—including hi-vis and performance workwear.",
  },
  {
    icon: PartyPopper,
    title: "Lounge & Event Wear",
    description: "Tees, hoodies, and casual pieces for company events, retreats, and internal swag drops.",
  },
];

export function CorporateApparelTypes() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Corporate Apparel for Every Role
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From executive suites to warehouse floors, we outfit every team member with quality branded apparel.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {apparelTypes.map((type, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <type.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">
                  {type.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {type.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
