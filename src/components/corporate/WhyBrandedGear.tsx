import { CheckCircle } from "lucide-react";
import corporateApparel from "@/assets/corporate-apparel.jpg";

export function WhyBrandedGear() {
  const benefits = [
    "Professional, consistent look across your organization",
    "Co-brand with premium retail labels",
    "Gear for office, job sites, trade shows, and client visits",
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="order-2 lg:order-1">
            <img
              src={corporateApparel}
              alt="Corporate apparel collection"
              className="rounded-2xl shadow-2xl w-full"
            />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Make Your Brand Wearable, Every Day
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              From the front desk to the field service team, branded apparel and merch turn every interaction into a brand touchpoint. Todd's Sporting Goods helps you co-brand with trusted name brands so your team looks sharp and feels confident.
            </p>
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
