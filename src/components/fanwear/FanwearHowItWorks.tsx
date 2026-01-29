import { Palette, Store, Share2, Truck } from "lucide-react";

const steps = [
  {
    icon: Palette,
    number: "01",
    title: "Design Your Collection",
    description: "Share your logo, colors, and any existing designs. Our team builds a fanwear lineup tailored to your community.",
  },
  {
    icon: Store,
    number: "02",
    title: "Choose Your Store Setup",
    description: "Pick between an online fanwear store, a limited-time pop-up, or order forms for in-person events.",
  },
  {
    icon: Share2,
    number: "03",
    title: "Promote to Your Community",
    description: "We give you ready-to-use flyers, QR codes, and social media graphics so promoting your fanwear is simple.",
  },
  {
    icon: Truck,
    number: "04",
    title: "We Produce & Deliver",
    description: "Todd's handles decoration and fulfillment. You choose whether items ship home or to your school/organization.",
  },
];

export function FanwearHowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          How Our Fanwear Program Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From design to delivery, we make launching your fanwear collection simple.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="text-center relative"
            >
              {/* Connector Line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}
              
              <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 border-2 border-accent mb-6">
                <step.icon className="w-10 h-10 text-accent" />
              </div>
              
              <div className="text-accent font-bold text-sm mb-2">{step.number}</div>
              <h3 className="font-bold text-xl text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
