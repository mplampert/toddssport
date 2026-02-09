import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Plus, Check } from "lucide-react";

export interface StoreLogo {
  id: string;
  name: string;
  file_url: string;
  placement: string | null;
  is_primary: boolean;
  method: string;
}

interface StoreLogoPickerProps {
  storeLogos: StoreLogo[];
  assignedLogoIds: Set<string>;
  onAdd: (logo: StoreLogo) => void;
}

export function StoreLogoPicker({ storeLogos, assignedLogoIds, onAdd }: StoreLogoPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return storeLogos;
    const q = search.toLowerCase();
    return storeLogos.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.method.toLowerCase().includes(q)
    );
  }, [storeLogos, search]);

  if (storeLogos.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          No logos in this store yet. Add logos in the store's <span className="font-medium">Logos</span> section first.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b space-y-2">
        <Label className="text-xs font-semibold">Store Logo Library</Label>
        {storeLogos.length > 4 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logos…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border max-h-[280px] overflow-y-auto">
        {filtered.map((logo) => {
          const isAdded = assignedLogoIds.has(logo.id);
          return (
            <div
              key={logo.id}
              className="bg-card p-2.5 flex flex-col items-center gap-2 group"
            >
              <div className="w-full aspect-square bg-muted/30 rounded-md flex items-center justify-center p-2 border">
                <img
                  src={logo.file_url}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="w-full text-center space-y-1">
                <p className="text-[11px] font-medium truncate" title={logo.name}>
                  {logo.name}
                </p>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] px-1 h-4">
                    {logo.method}
                  </Badge>
                  {logo.is_primary && (
                    <Badge variant="secondary" className="text-[9px] px-1 h-4">
                      Primary
                    </Badge>
                  )}
                </div>
              </div>
              {isAdded ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full h-7 text-[10px]"
                  disabled
                >
                  <Check className="w-3 h-3 mr-1" /> Added
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] opacity-80 group-hover:opacity-100"
                  onClick={() => onAdd(logo)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add to Product
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground">
          No logos match "{search}"
        </div>
      )}
    </div>
  );
}
