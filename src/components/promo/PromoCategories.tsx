import { Coffee, ShoppingBag, Pencil, Smartphone, TreePine, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    icon: Coffee,
    title: "Drinkware",
    description: "Tumblers, mugs, and water bottles that go from desk to commute to gym.",
  },
  {
    icon: ShoppingBag,
    title: "Bags & Totes",
    description: "Backpacks, totes, and coolers that keep your brand on the move.",
  },
  {
    icon: Pencil,
    title: "Writing & Office",
    description: "Pens, notebooks, desk accessories, and tech essentials for everyday use.",
  },
  {
    icon: Smartphone,
    title: "Tech & Gadgets",
    description: "Chargers, earbuds, power banks, and tech accessories that people use daily.",
  },
  {
    icon: TreePine,
    title: "Outdoor & Lifestyle",
    description: "Blankets, chairs, coolers, and outdoor gear for tailgates, golf, and events.",
  },
  {
    icon: ShieldCheck,
    title: "Health, Safety & More",
    description: "Wellness items, PPE, and unique specialty products tailored to your message.",
  },
];

export function PromoCategories() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Promo Categories We Specialize In
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From everyday essentials to premium gifts, we source and decorate products across every category.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <category.icon className="w-6 h-6 text-navy" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      {category.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
