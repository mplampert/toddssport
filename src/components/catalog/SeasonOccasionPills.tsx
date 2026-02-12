import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export interface CollectionPill {
  label: string;
  filterType: "season" | "occasion";
  filterValue: string;
}

export const COLLECTION_PILLS: CollectionPill[] = [
  { label: "🍂 Fall Favorites", filterType: "season", filterValue: "fall" },
  { label: "❄️ Cold Weather Gear", filterType: "season", filterValue: "winter" },
  { label: "🌸 Spring Styles", filterType: "season", filterValue: "spring" },
  { label: "☀️ Summer Essentials", filterType: "season", filterValue: "summer" },
  { label: "🏐 Tournament Packages", filterType: "occasion", filterValue: "tournaments" },
  { label: "🏆 Playoff Ready", filterType: "occasion", filterValue: "playoffs" },
  { label: "🎒 Back to School", filterType: "occasion", filterValue: "tryouts" },
  { label: "💰 Fundraiser Picks", filterType: "occasion", filterValue: "fundraisers" },
  { label: "🎄 Holiday", filterType: "occasion", filterValue: "holiday" },
];

interface SeasonOccasionPillsProps {
  activeFilter: { type: "season" | "occasion"; value: string } | null;
  onSelect: (pill: CollectionPill | null) => void;
}

export function SeasonOccasionPills({ activeFilter, onSelect }: SeasonOccasionPillsProps) {
  return (
    <section className="py-4 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Collections</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {COLLECTION_PILLS.map((pill) => {
            const isActive =
              activeFilter?.type === pill.filterType &&
              activeFilter?.value === pill.filterValue;
            return (
              <button
                key={pill.label}
                onClick={() => onSelect(isActive ? null : pill)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-card text-foreground border-border hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
