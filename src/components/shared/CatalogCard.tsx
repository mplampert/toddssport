import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CatalogCardProps {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  catalogUrl: string;
  category?: string;
}

export function CatalogCard({
  title,
  description,
  thumbnailUrl,
  catalogUrl,
  category,
}: CatalogCardProps) {
  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Thumbnail */}
      <div className="relative h-48 bg-secondary overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {title.charAt(0)}
            </span>
          </div>
        )}
        {category && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm"
          >
            {category}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-accent transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-grow">
            {description}
          </p>
        )}
        <Button
          asChild
          className="btn-cta w-full mt-auto"
        >
          <a href={catalogUrl} target="_blank" rel="noopener noreferrer">
            View Catalog
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
