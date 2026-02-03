import { Palette, ShoppingCart, Truck } from "lucide-react";

const steps = [
  {
    icon: Palette,
    number: "01",
    title: "Design Your Uniform",
    description:
      "Use our interactive builder to choose colors, add your logo, and preview your custom uniform in real time.",
  },
  {
    icon: ShoppingCart,
    number: "02",
    title: "Place Your Order",
    description:
      "Add player names and numbers, select your quantities, and check out securely online.",
  },
  {
    icon: Truck,
    number: "03",
    title: "We Deliver",
    description:
      "Your uniforms are produced in the USA and shipped directly to you—ready for game day.",
  },
];

export function UniformHowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From design to delivery, we make ordering custom uniforms easy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              {/* Connector Line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 border-2 border-accent mb-6">
                <step.icon className="w-10 h-10 text-accent" />
              </div>

              <div className="text-accent font-bold text-sm mb-2">
                {step.number}
              </div>
              <h3 className="font-bold text-xl text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
