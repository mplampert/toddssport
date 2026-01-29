import { Coffee, Briefcase, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import promoProducts from "@/assets/promo-products.jpg";

const productCategories = [
  {
    icon: Coffee,
    title: "Drinkware & Desk Essentials",
    description: "Tumblers, mugs, water bottles, notebooks, pens, and desk accessories for everyday visibility.",
  },
  {
    icon: Briefcase,
    title: "Bags & Travel Gear",
    description: "Backpacks, duffels, tote bags, and travel accessories for employees and VIP clients.",
  },
  {
    icon: Gift,
    title: "Event & Gifting",
    description: "Gift sets, tech accessories, and premium giveaways for conferences, holidays, and client appreciation.",
  },
];

export function PromoProducts() {
  const scrollToForm = () => {
    const formSection = document.getElementById("corporate-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Promotional Products That Keep Your Brand in Their Hand
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              From the boardroom to the backyard, branded gear and giveaways keep your logo where it matters. Todd's sources and decorates high-impact promotional items that people actually keep and use.
            </p>
          </div>

          {/* Image */}
          <div>
            <img
              src={promoProducts}
              alt="Promotional products collection"
              className="rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>

        {/* Product Categories */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {productCategories.map((category, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center mb-4">
                  <category.icon className="w-6 h-6 text-navy" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {category.title}
                </h3>
                <p className="text-muted-foreground">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={scrollToForm} size="lg" className="btn-cta">
            Explore Promo Product Ideas
          </Button>
        </div>
      </div>
    </section>
  );
}
