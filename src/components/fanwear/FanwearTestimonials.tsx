import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Our fanwear store sold out in the first week and funded our entire travel budget.",
    name: "Mike Thompson",
    role: "Athletic Director, Local High School",
  },
  {
    quote: "Parents loved being able to order online and pick from multiple styles and fits.",
    name: "Sarah Mitchell",
    role: "Booster Club President",
  },
  {
    quote: "The quality of the hoodies exceeded our expectations. We've already reordered twice this year.",
    name: "Jennifer Adams",
    role: "PTO Coordinator",
  },
];

export function FanwearTestimonials() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          What Programs Say About Our Fanwear
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-card rounded-xl border border-border p-8"
            >
              <Quote className="w-10 h-10 text-accent/30 mb-4" />
              <p className="text-foreground text-lg italic mb-6">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-bold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
