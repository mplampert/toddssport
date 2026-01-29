import { Sparkles, Award, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: Sparkles,
    title: "Curated, Not Cluttered",
    description: "We help you narrow thousands of options into a tight, on-brand selection your audience will love.",
  },
  {
    icon: Award,
    title: "Quality Brands & Decoration",
    description: "From value pieces to premium retail names, we source products that decorate well and last.",
  },
  {
    icon: Handshake,
    title: "End-to-End Support",
    description: "Sourcing, decoration, kitting, and shipping handled under one roof, so your team doesn't have to juggle vendors.",
  },
];

export function WhyPromoWithTodds() {
  return (
    <section className="py-20 bg-navy text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Teams & Businesses Choose Todd's for Promo
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            More than a catalog—we're your partner in building impactful branded merchandise programs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="w-8 h-8 text-navy" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {benefit.title}
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
