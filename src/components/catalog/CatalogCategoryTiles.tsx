import { CATEGORY_GROUPS } from "@/lib/catalogCategories";

interface CatalogCategoryTilesProps {
  onSelect: (groupLabel: string) => void;
  activeCategory: string | null;
}

export function CatalogCategoryTiles({ onSelect, activeCategory }: CatalogCategoryTilesProps) {
  return (
    <section className="py-8 border-b border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
          {CATEGORY_GROUPS.map((group) => {
            const isActive = activeCategory === group.label;
            return (
              <button
                key={group.label}
                onClick={() => onSelect(isActive ? "" : group.label)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                  isActive
                    ? "border-accent bg-accent/10 ring-1 ring-accent/30 shadow-sm"
                    : "border-border bg-card hover:border-accent/40 hover:bg-accent/5 hover:shadow-sm"
                }`}
              >
                <span className="text-2xl flex-shrink-0">{group.icon}</span>
                <span className={`text-sm font-medium leading-tight ${isActive ? "text-accent" : "text-foreground"}`}>
                  {group.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
