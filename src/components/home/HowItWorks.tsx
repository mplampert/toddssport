import { MessageSquare, Palette, Package } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Tell Us About Your Team",
    description: "Share your team or business details, quantities, and timeline. We'll help you find the perfect solution.",
  },
  {
    icon: Palette,
    number: "02",
    title: "We Design & Quote",
    description: "Our team creates custom mockups and provides transparent pricing. No surprises, just great service.",
  },
  {
    icon: Package,
    number: "03",
    title: "Approve & Gear Up",
    description: "Once approved, we produce your order with care and deliver on time, every time.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-padding bg-navy-gradient">
      <div className="container mx-auto px-4">
        <h2 className="section-heading text-primary-foreground">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="text-center relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-primary-foreground/20" />
              )}
              
              <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent mb-6">
                <step.icon className="w-10 h-10 text-accent-foreground" />
              </div>
              
              <div className="text-accent font-bold text-sm mb-2">{step.number}</div>
              <h3 className="font-bold text-xl text-primary-foreground mb-3">{step.title}</h3>
              <p className="text-primary-foreground/70 max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
