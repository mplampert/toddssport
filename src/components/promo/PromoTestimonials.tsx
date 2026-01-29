import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote: "Todd's handled everything for our conference swag—from sourcing to shipping boxes to each attendee. It was seamless.",
    author: "Marketing Director",
    company: "Regional Tech Conference",
  },
  {
    quote: "Our clients actually use the gifts we send now, and the feedback has been great. Quality makes all the difference.",
    author: "Account Executive",
    company: "Financial Services Firm",
  },
  {
    quote: "The onboarding kits Todd's put together for our new hires are always a hit. It's a great way to start day one.",
    author: "HR Manager",
    company: "Growing Healthcare Company",
  },
];

export function PromoTestimonials() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Programs We Support
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From local businesses and schools to regional brands, Todd's helps organizations of all sizes build promo programs that work.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <Quote className="w-10 h-10 text-accent/30 mb-4" />
                <p className="text-foreground mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold text-primary">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
