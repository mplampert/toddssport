import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt, Coffee, PenTool, Briefcase, ArrowRight } from "lucide-react";
import promoProductsImage from "@/assets/promo-products.jpg";

const useCases = [
  "Sales leave-behinds and client gifts",
  "Campus, league, or tournament swag",
  "Web store merch for fans and families",
];

const productTypes = [
  {
    icon: Shirt,
    title: "Apparel",
    description: "Tees, hoodies, outerwear.",
  },
  {
    icon: Coffee,
    title: "Drinkware",
    description: "Bottles, tumblers, mugs.",
  },
  {
    icon: PenTool,
    title: "Desk & Tech",
    description: "Notebooks, pens, chargers, mousepads.",
  },
  {
    icon: Briefcase,
    title: "On-the-Go",
    description: "Bags, caps, lanyards.",
  },
];

const processSteps = [
  {
    step: "1",
    text: "Share your audience, budget, and timeline.",
  },
  {
    step: "2",
    text: "We present curated options and mockups.",
  },
  {
    step: "3",
    text: "You approve and we handle production and delivery.",
  },
];

export function BrandedMerchandise() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
          Branded Merchandise That Sticks Around.
        </h2>
        <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
          Build memorable touchpoints with high-impact branded merchandise, curated for your audience and brand style.
        </p>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
          {/* Left Column - Content */}
          <div>
            {/* Use Cases */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">Use cases</h3>
              <ul className="space-y-2">
                {useCases.map((useCase, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-accent font-bold">•</span>
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Type Tiles */}
            <div className="grid grid-cols-2 gap-4">
              {productTypes.map((product, index) => (
                <Card key={index} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <product.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h4 className="font-semibold text-foreground">{product.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <img
              src={promoProductsImage}
              alt="Branded merchandise products"
              className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
            />
          </div>
        </div>

        {/* 3-Step Process */}
        <div className="bg-secondary rounded-xl p-8 mb-10">
          <div className="grid md:grid-cols-3 gap-6">
            {processSteps.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <p className="text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button onClick={scrollToForm} size="lg" className="btn-cta">
            Explore branded merchandise
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
