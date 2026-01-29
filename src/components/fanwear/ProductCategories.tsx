import { Shirt, Clock, HardHat, Cloudy, Gift, GraduationCap } from "lucide-react";

const categories = [
  {
    icon: Shirt,
    title: "Hoodies & Crewnecks",
    description: "The cornerstone of any spirit collection. Heavyweight and mid-weight options in your colors.",
  },
  {
    icon: Clock,
    title: "T-Shirts & Long Sleeves",
    description: "Daily-wear staples for students and fans, perfect for events, spirit weeks, and giveaways.",
  },
  {
    icon: HardHat,
    title: "Hats & Beanies",
    description: "Embroidered caps and knit hats that keep your logo front and center all year long.",
  },
  {
    icon: Cloudy,
    title: "Jackets & Outerwear",
    description: "Sideline jackets, vests, and rain gear to keep fans comfortable in all conditions.",
  },
  {
    icon: Gift,
    title: "Accessories & Extras",
    description: "Blankets, scarves, bags, drinkware, and more to round out your spirit offering.",
  },
  {
    icon: GraduationCap,
    title: "Alumni & Staff Collections",
    description: "Special designs just for alumni, teachers, and staff.",
  },
];

export function ProductCategories() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          What We Can Create For Your Fans
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From everyday essentials to premium gear, we've got your community covered.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {categories.map((category, index) => (
            <div 
              key={index}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{category.title}</h3>
                  <p className="text-muted-foreground text-sm">{category.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
