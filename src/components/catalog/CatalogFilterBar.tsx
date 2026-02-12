import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { CATEGORY_GROUPS } from "@/lib/catalogCategories";

interface BrandOption {
  id: string;
  name: string;
}

interface CatalogFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  brandFilter: string;
  onBrandChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  brands: BrandOption[];
  onClearAll: () => void;
  totalCount: number;
  collectionFilter?: { type: string; value: string } | null;
  onCollectionClear?: () => void;
}

export function CatalogFilterBar({
  search,
  onSearchChange,
  brandFilter,
  onBrandChange,
  categoryFilter,
  onCategoryChange,
  brands,
  onClearAll,
  totalCount,
  collectionFilter,
  onCollectionClear,
}: CatalogFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = search || brandFilter !== "all" || categoryFilter !== "all" || !!collectionFilter;

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (collectionFilter) {
    activeChips.push({
      label: `${collectionFilter.type === "season" ? "Season" : "Occasion"}: ${collectionFilter.value}`,
      onRemove: () => onCollectionClear?.(),
    });
  }
  if (categoryFilter !== "all") {
    activeChips.push({
      label: categoryFilter,
      onRemove: () => onCategoryChange("all"),
    });
  }
  if (brandFilter !== "all") {
    activeChips.push({
      label: brandFilter,
      onRemove: () => onBrandChange("all"),
    });
  }
  if (search) {
    activeChips.push({
      label: `"${search}"`,
      onRemove: () => onSearchChange(""),
    });
  }

  return (
    <section className="border-b border-border bg-card sticky top-16 md:top-20 z-30">
      <div className="container mx-auto px-4 py-3">
        {/* Search + filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, style code, or brand…"
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            className="sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <div className={`flex gap-3 ${showFilters ? "flex" : "hidden sm:flex"}`}>
            <Select value={brandFilter} onValueChange={onBrandChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_GROUPS.map((g) => (
                  <SelectItem key={g.label} value={g.label}>
                    {g.icon} {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">
              {totalCount.toLocaleString()} result{totalCount !== 1 ? "s" : ""}
            </span>
            {activeChips.map((chip) => (
              <Badge
                key={chip.label}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                onClick={chip.onRemove}
              >
                {chip.label}
                <X className="w-3 h-3 ml-0.5" />
              </Badge>
            ))}
            <button
              onClick={onClearAll}
              className="text-xs text-accent hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
