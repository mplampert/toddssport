import { Link } from "react-router-dom";
import { useUniformCards } from "@/hooks/useUniformCards";
import { Star } from "lucide-react";

export function FeaturedSportsStrip() {
  const { getFeaturedCards, loading } = useUniformCards();
  const featuredCards = getFeaturedCards();

  if (loading || featuredCards.length === 0) return null;

  return (
    <section className="bg-accent/10 border-y border-accent/20 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 text-accent font-semibold">
            <Star className="w-5 h-5 fill-current" />
            <span className="text-sm uppercase tracking-wide">Featured This Season</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-6">
            {featuredCards.map((card) => (
              <Link
                key={card.id}
                to={`/uniforms/${card.slug}`}
                className="group flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border hover:border-accent hover:shadow-md transition-all duration-200"
              >
                {card.icon && <span className="text-xl">{card.icon}</span>}
                <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                  {card.featured_label || card.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
