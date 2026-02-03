import { Link } from "react-router-dom";
import { useUniformCards, UniformCard } from "@/hooks/useUniformCards";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function SportCard({ card }: { card: UniformCard }) {
  return (
    <Link
      to={`/uniforms/${card.slug}`}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-accent/50 transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={card.image_url || "/placeholder.svg"}
          alt={`${card.title} uniforms`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        {card.is_featured && (
          <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
            {card.featured_label || "Featured"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {card.icon && <span className="text-2xl">{card.icon}</span>}
          <h3 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors">
            {card.title}
          </h3>
        </div>
        {card.subtitle && (
          <p className="text-sm text-accent font-medium mb-2">{card.subtitle}</p>
        )}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {card.description}
        </p>
        <div className="flex items-center text-accent font-semibold text-sm group-hover:gap-2 transition-all">
          {card.cta_text || "View Uniform Options"}
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UniformsGrid() {
  const { cards, loading, error } = useUniformCards();

  return (
    <section id="uniforms-grid" className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Uniforms by Sport
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your sport to explore uniform options, styles, and customization features.
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <p className="text-center text-destructive">Failed to load uniform cards.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cards.map((card) => (
              <SportCard key={card.id} card={card} />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Don't see your sport? We can outfit virtually any team.
          </p>
          <Button variant="outline" size="lg" asChild>
            <Link to="/contact">Contact Us for Custom Options</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
