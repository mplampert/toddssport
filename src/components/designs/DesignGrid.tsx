import { useState } from "react";
import { useDesignTemplates, DESIGN_CATEGORIES, DesignTemplate } from "@/hooks/useDesignTemplates";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DESIGN_IMAGE_FALLBACKS } from "@/lib/designImageFallbacks";

interface DesignGridProps {
  /** Admin mode: called with design code when a tile is clicked */
  onSelectDesign?: (code: string) => void;
  /** If true, suppresses the public info modal in favor of onSelectDesign */
  adminMode?: boolean;
}

export function DesignGrid({ onSelectDesign, adminMode = false }: DesignGridProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate | null>(null);

  const { data: designs = [], isLoading } = useDesignTemplates(
    activeCategory === "all" ? undefined : activeCategory,
  );

  const filtered = search.trim()
    ? designs.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.code.toLowerCase().includes(search.toLowerCase()) ||
          d.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : designs;

  const handleTileClick = (design: DesignTemplate) => {
    if (adminMode && onSelectDesign) {
      onSelectDesign(design.code);
    } else {
      setSelectedDesign(design);
    }
  };

  return (
    <section className="container mx-auto px-4 py-10 md:py-16">
      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-primary p-1 rounded-none md:rounded-md">
          <TabsTrigger
            value="all"
            className="text-xs md:text-sm font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-primary-foreground/70 rounded-sm px-4 py-2"
          >
            All
          </TabsTrigger>
          {DESIGN_CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="text-xs md:text-sm font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-primary-foreground/70 rounded-sm px-4 py-2"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search designs by name, code, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No designs found</p>
          <p className="text-sm mt-1">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((design) => (
            <button
              key={design.id}
              onClick={() => handleTileClick(design)}
              className="group relative bg-destructive/10 rounded-lg overflow-hidden border border-border hover:border-accent transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {(design.image_url || DESIGN_IMAGE_FALLBACKS[design.code]) ? (
                <img
                  src={design.image_url || DESIGN_IMAGE_FALLBACKS[design.code]}
                  alt={design.name}
                  className="w-full aspect-square object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground text-xs">No image</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground px-2 py-1.5">
                <p className="text-[10px] md:text-xs font-mono truncate">{design.code}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Public Info Modal */}
      <Dialog open={!!selectedDesign && !adminMode} onOpenChange={() => setSelectedDesign(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDesign?.name}</DialogTitle>
            <DialogDescription>Design Code: {selectedDesign?.code}</DialogDescription>
          </DialogHeader>

          {(selectedDesign?.image_url || (selectedDesign && DESIGN_IMAGE_FALLBACKS[selectedDesign.code])) && (
            <img
              src={selectedDesign!.image_url || DESIGN_IMAGE_FALLBACKS[selectedDesign!.code]}
              alt={selectedDesign!.name}
              className="w-full max-h-64 object-contain bg-muted rounded-lg p-4"
            />
          )}

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Sport:</span>
              <span className="capitalize">{selectedDesign?.sport}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Category:</span>
              <Badge variant="secondary" className="capitalize">
                {DESIGN_CATEGORIES.find((c) => c.value === selectedDesign?.category)?.label ?? selectedDesign?.category}
              </Badge>
            </div>
            {selectedDesign?.tags && selectedDesign.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDesign.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Interested in this design? <a href="/contact" className="text-accent underline">Contact us</a> to get started!
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
