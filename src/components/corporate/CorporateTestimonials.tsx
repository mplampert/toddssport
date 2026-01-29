import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote: "Todd's helped standardize our look across 5 locations and 150 employees. The quality and consistency have been outstanding.",
    author: "Operations Director",
    company: "Regional Healthcare Network",
  },
  {
    quote: "Our sales team loves the co-branded gear—they actually wear it. The Nike polos with our logo were a huge hit.",
    author: "VP of Sales",
    company: "Technology Solutions Company",
  },
  {
    quote: "The company store they set up for us has saved hours of admin time. Employees order what they need, and Todd's handles the rest.",
    author: "HR Manager",
    company: "Multi-Location Franchise Group",
  },
];

export function CorporateTestimonials() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Trusted by Teams & Businesses
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organizations across New England turn to Todd's Sporting Goods for professional, on-brand corporate apparel and merch.
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
