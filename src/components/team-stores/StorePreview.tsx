import { Package, Heart, UserCheck, Gift } from "lucide-react";

const previewCategories = [
  {
    title: "Player Packages",
    icon: Package,
    items: ["Game Jerseys", "Practice Jerseys", "Team Shorts", "Warm-Ups"],
  },
  {
    title: "Fanwear & Spirit Wear",
    icon: Heart,
    items: ["Team Hoodies", "Spirit T-Shirts", "Rally Towels", "Blankets"],
  },
  {
    title: "Coaches & Staff Gear",
    icon: UserCheck,
    items: ["Coaches Polos", "Staff Jackets", "Team Caps", "Sideline Gear"],
  },
  {
    title: "Accessories & Extras",
    icon: Gift,
    items: ["Team Bags", "Water Bottles", "Stickers", "Lanyards"],
  },
];

export function StorePreview() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          What Your Store Could Include
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Every store is fully customized to your program. Here's a sample of what we can offer.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewCategories.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            return (
              <div 
                key={categoryIndex}
                className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <IconComponent className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">
                    {category.title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Pricing varies by program. We'll provide a custom quote based on your specific needs.
        </p>
      </div>
    </section>
  );
}
