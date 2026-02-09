import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, Eye, EyeOff, Package, DollarSign, Percent, ToggleRight } from "lucide-react";
import { getProductImage } from "@/lib/productImages";
import { InlineProductRow } from "./InlineProductRow";
import type { VariantImage } from "@/hooks/useVariantImages";
import type { EffectiveCategory } from "./StoreCategoryManager";

export interface StoreProduct {
  id: string;
  style_id: number;
  sort_order: number;
  notes: string | null;
  price_override: number | null;
  active: boolean;
  fundraising_enabled: boolean;
  fundraising_amount_per_unit: number | null;
  fundraising_percentage: number | null;
  personalization_enabled: boolean;
  personalization_price: number | null;
  personalization_config: any;
  screen_print_enabled: boolean;
  embroidery_enabled: boolean;
  dtf_enabled: boolean;
  category_id: string | null;
  store_category_override_id: string | null;
  display_name: string | null;
  display_color: string | null;
  primary_image_url: string | null;
  extra_image_urls: string[] | null;
  internal_notes: string | null;
  allowed_colors: any;
  catalog_styles: {
    id: number;
    style_id: number;
    style_name: string;
    brand_name: string;
    style_image: string | null;
    description: string | null;
  } | null;
  team_store_categories?: { id: string; name: string } | null;
}

interface Props {
  products: StoreProduct[];
  categories: EffectiveCategory[];
  variantImages?: VariantImage[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onBulkAction: (action: "show" | "hide" | "delete", ids: string[]) => void;
  onBulkEdit?: (mode: "price" | "fundraising" | "personalization") => void;
  onUpdate?: (id: string, fields: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  initialSearch?: string;
  initialCategory?: string;
  initialStatus?: string;
}

export function ProductListPane({
  products,
  categories,
  variantImages = [],
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onSelectAll,
  onBulkAction,
  onBulkEdit,
  onUpdate,
  isLoading,
  initialSearch = "",
  initialCategory = "all",
  initialStatus = "all",
}: Props) {
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const name = (p.display_name || p.catalog_styles?.style_name || "").toLowerCase();
        const brand = (p.catalog_styles?.brand_name || "").toLowerCase();
        const sid = String(p.catalog_styles?.style_id || "");
        return name.includes(q) || brand.includes(q) || sid.includes(q);
      });
    }
    if (categoryFilter === "uncategorized") {
      list = list.filter((p) => !p.category_id && !p.store_category_override_id);
    } else if (categoryFilter !== "all") {
      list = list.filter(
        (p) => p.category_id === categoryFilter || p.store_category_override_id === categoryFilter
      );
    }
    if (statusFilter === "active") list = list.filter((p) => p.active);
    if (statusFilter === "hidden") list = list.filter((p) => !p.active);
    return list;
  }, [products, search, categoryFilter, statusFilter]);

  const allFilteredIds = filtered.map((p) => p.id);
  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  // Resolve variant image for a product
  const resolveImage = (item: StoreProduct): string | null => {
    const itemVariants = variantImages.filter((v) => v.team_store_product_id === item.id);
    if (itemVariants.length > 0) {
      const allowedColors = Array.isArray(item.allowed_colors) ? item.allowed_colors : [];
      const firstName = allowedColors.length > 0 ? allowedColors[0]?.name : null;
      if (firstName) {
        const colorImgs = itemVariants.filter((v) => v.color === firstName);
        const found = (colorImgs.find((v) => v.is_primary) || colorImgs[0])?.image_url ?? null;
        if (found) return found;
      }
      return (itemVariants.find((v) => v.is_primary) || itemVariants[0])?.image_url ?? null;
    }
    return getProductImage(item);
  };

  const noopUpdate = async () => {};

  return (
    <div className="flex flex-col h-full">
      {/* Search + Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, brand, style ID…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.filter((c) => !c.hidden).map((c) => (
                <SelectItem key={c.id} value={c.globalCategoryId ?? c.id}>{c.name}</SelectItem>
              ))}
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-2 border-b bg-muted/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onBulkAction("show", Array.from(selectedIds))}>
            <Eye className="w-3 h-3 mr-1" /> Show
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onBulkAction("hide", Array.from(selectedIds))}>
            <EyeOff className="w-3 h-3 mr-1" /> Hide
          </Button>
          {onBulkEdit && (
            <>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onBulkEdit("price")}>
                <DollarSign className="w-3 h-3 mr-1" /> Price
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onBulkEdit("fundraising")}>
                <Percent className="w-3 h-3 mr-1" /> Fund %
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onBulkEdit("personalization")}>
                <ToggleRight className="w-3 h-3 mr-1" /> Pers
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-destructive" onClick={() => onBulkAction("delete", Array.from(selectedIds))}>
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Product List */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No products match your filters.</p>
          </div>
        ) : (
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onSelectAll(v ? allFilteredIds : [])}
                className="h-3.5 w-3.5 shrink-0"
              />
              <span className="flex-1">Product</span>
              <span className="w-20 text-right shrink-0">Price $</span>
              <span className="w-16 text-right shrink-0">Fund %</span>
              <span className="w-10 text-center shrink-0">Pers</span>
              <span className="w-14 text-center shrink-0">Status</span>
              <span className="w-6 shrink-0" />
            </div>
            {filtered.map((item) => (
              <InlineProductRow
                key={item.id}
                item={item}
                imgSrc={resolveImage(item)}
                isChecked={selectedIds.has(item.id)}
                isHighlighted={selectedId === item.id}
                onNavigate={() => onSelect(item.id)}
                onToggleCheck={() => onToggleSelect(item.id)}
                onUpdate={onUpdate ?? noopUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground">
        {filtered.length} of {products.length} products
      </div>
    </div>
  );
}
