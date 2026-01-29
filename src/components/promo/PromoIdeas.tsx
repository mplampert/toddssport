import { Heart, Briefcase, Calendar, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ideas = [
  {
    icon: Heart,
    title: "Employee Appreciation & Milestones",
    description: "Service anniversaries, Employee Appreciation Day, promotions, and recognition programs.",
  },
  {
    icon: Briefcase,
    title: "Client & Partner Gifting",
    description: "Holiday gifts, thank-you campaigns, and deal-closing moments.",
  },
  {
    icon: Calendar,
    title: "Events & Launches",
    description: "Trade shows, conferences, product launches, and community events.",
  },
  {
    icon: UserPlus,
    title: "Welcome & Onboarding Kits",
    description: "New hire kits and intern packages that make day one unforgettable.",
  },
];

export function PromoIdeas() {
  const scrollToForm = () => {
    const formSection = document.getElementById("promo-form");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Promo Ideas for Every Moment
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Not sure where to start? Here are some of our most popular use cases.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ideas.map((idea, index) => (
            <Card 
              key={index} 
              className="border-none shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
              onClick={scrollToForm}
            >
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                  <idea.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-3">
                  {idea.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {idea.description}
                </p>
                <span className="text-accent font-medium text-sm hover:underline">
                  Get ideas →
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
