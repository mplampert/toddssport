import { Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  logo_url: string | null;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Mike Johnson",
    role: "Athletic Director, Central High School",
    quote: "Todd's has been our go-to for team uniforms for over 10 years. Their quality and service are unmatched.",
    logo_url: null,
  },
  {
    id: "2",
    name: "Sarah Williams",
    role: "President, Hometown Youth Soccer",
    quote: "They made outfitting our entire league simple and affordable. The kids love their new jerseys!",
    logo_url: null,
  },
  {
    id: "3",
    name: "Tom Richardson",
    role: "Owner, Richardson Plumbing",
    quote: "Professional embroidered polos and jackets that make our team look sharp on every job site.",
    logo_url: null,
  },
];

interface TestimonialsProps {
  testimonials?: Testimonial[];
}

export function Testimonials({ testimonials = defaultTestimonials }: TestimonialsProps) {
  return (
    <section className="section-padding">
      <div className="container mx-auto px-4">
        <h2 className="section-heading text-primary">Trusted by Teams & Businesses</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id}
              className="testimonial-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Quote className="w-10 h-10 text-accent mb-4 opacity-50" />
              <p className="testimonial-quote">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                {testimonial.logo_url ? (
                  <img 
                    src={testimonial.logo_url} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="font-bold text-accent">{testimonial.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-primary">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
