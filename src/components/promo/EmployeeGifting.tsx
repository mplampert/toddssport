import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCw, CalendarDays, Rocket, Check } from "lucide-react";
import giftBoxImage from "@/assets/promo-gift-box.jpg";

const programTypes = [
  {
    icon: RefreshCw,
    title: "Always-On Gifting",
    description: "Keep ready-to-ship kits for new hires and client wins.",
  },
  {
    icon: CalendarDays,
    title: "Seasonal Drops",
    description: "Holiday and campaign gifts planned and shipped on your schedule.",
  },
  {
    icon: Rocket,
    title: "One-Time Projects",
    description: "Perfect for launches, major events, or rebrands.",
  },
];

const features = [
  "Centralized ordering and approvals.",
  "Individual shipping to home or office.",
  "Kitting, packing, and on-brand unboxing.",
];

export function EmployeeGifting() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="section-padding bg-secondary">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
          Employee & Customer Gifting Programs.
        </h2>
        <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
          Welcome kits, thank-you gifts, and seasonal campaigns that make employees and customers feel valued.
        </p>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
          {/* Left Column - Image */}
          <div className="order-2 lg:order-1">
            <img
              src={giftBoxImage}
              alt="Employee and customer gift box"
              className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]"
            />
          </div>

          {/* Right Column - Content */}
          <div className="order-1 lg:order-2">
            {/* Program Type Cards */}
            <div className="space-y-4 mb-8">
              {programTypes.map((program, index) => (
                <Card key={index} className="border border-border bg-background">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <program.icon className="h-5 w-5 text-accent" />
                      </div>
                      <CardTitle className="text-lg">{program.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{program.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Features List */}
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground">
                  <Check className="h-5 w-5 text-accent flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Button onClick={scrollToForm} size="lg" className="btn-cta">
              Explore gifting programs
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
