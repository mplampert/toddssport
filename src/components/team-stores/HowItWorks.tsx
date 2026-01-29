import { MessageSquare, Palette, Share2, Package } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Tell Us About Your Program",
    description: "Share your sport, colors, logo, and what types of products you want in the store.",
  },
  {
    icon: Palette,
    number: "02",
    title: "We Build Your Custom Store",
    description: "We design the store, load products and pricing, and make it easy for parents and fans to shop.",
  },
  {
    icon: Share2,
    number: "03",
    title: "Share the Link",
    description: "You get a simple link and QR code to send to your program. No paper forms, no money collection.",
  },
  {
    icon: Package,
    number: "04",
    title: "We Deliver & You Profit",
    description: "Todd's handles decoration and fulfillment. Optionally, add fundraising to every item for your program.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          How a Todd's Team Store Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From concept to delivery, we handle everything so you can focus on your team.
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
