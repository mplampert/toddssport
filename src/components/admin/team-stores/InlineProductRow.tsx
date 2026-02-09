import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RotateCcw } from "lucide-react";
import { DecoratedThumbnail } from "./DecoratedThumbnail";
import type { StoreProduct } from "./ProductListPane";

interface Props {
  item: StoreProduct;
  imgSrc: string | null;
  logoOverlays?: { logo_url: string; x: number; y: number; scale: number }[];
  isChecked: boolean;
  isHighlighted: boolean;
  onNavigate: () => void;
  onToggleCheck: () => void;
  onUpdate: (id: string, fields: Record<string, any>) => Promise<void>;
}

export function InlineProductRow({
  item,
  imgSrc,
  logoOverlays = [],
  isChecked,
  isHighlighted,
  onNavigate,
  onToggleCheck,
  onUpdate,
}: Props) {
  const style = item.catalog_styles;
  const name = item.display_name || style?.style_name || `Style #${item.style_id}`;

  const [priceVal, setPriceVal] = useState(
    item.price_override != null ? String(item.price_override) : ""
  );
  const [fundVal, setFundVal] = useState(
    item.fundraising_percentage != null ? String(item.fundraising_percentage) : ""
  );

  // Sync local state when item data changes (after save / bulk update)
  useEffect(() => {
    setPriceVal(item.price_override != null ? String(item.price_override) : "");
  }, [item.price_override]);

  useEffect(() => {
    setFundVal(item.fundraising_percentage != null ? String(item.fundraising_percentage) : "");
  }, [item.fundraising_percentage]);

  const savePrice = async () => {
    const num = priceVal.trim() === "" ? null : Number(priceVal);
    if (num === item.price_override) return;
    await onUpdate(item.id, { price_override: num });
  };

  const saveFund = async () => {
    const num = fundVal.trim() === "" ? null : Number(fundVal);
    if (num === item.fundraising_percentage) return;
    const fields: Record<string, any> = { fundraising_percentage: num };
    // auto-enable fundraising when setting a %
    if (num != null && num > 0 && !item.fundraising_enabled) {
      fields.fundraising_enabled = true;
    }
    await onUpdate(item.id, fields);
  };

  const toggleActive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(item.id, { active: !item.active });
  };

  const togglePersonalization = () => {
    onUpdate(item.id, { personalization_enabled: !item.personalization_enabled });
  };

  const resetOverrides = () => {
    onUpdate(item.id, {
      price_override: null,
      fundraising_percentage: null,
      fundraising_amount_per_unit: null,
    });
    setPriceVal("");
    setFundVal("");
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
        isHighlighted ? "bg-accent/10 border-l-2 border-l-accent" : ""
      }`}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isChecked}
        onCheckedChange={() => onToggleCheck()}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0"
      />

      {/* Name + Image — click navigates */}
      <div
        className="flex items-center gap-2 min-w-0 flex-1"
        onClick={onNavigate}
      >
        <DecoratedThumbnail
          imgSrc={imgSrc}
          logos={logoOverlays}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {style?.brand_name}
          </p>
        </div>
      </div>

      {/* Price Override */}
      <div className="w-20 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Input
          value={priceVal}
          onChange={(e) => setPriceVal(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
          placeholder="—"
          className="h-7 text-xs text-right tabular-nums px-1.5"
          type="number"
          step="0.01"
          min="0"
        />
      </div>

      {/* Fundraising % */}
      <div className="w-16 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Input
          value={fundVal}
          onChange={(e) => setFundVal(e.target.value)}
          onBlur={saveFund}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
          placeholder="—"
          className="h-7 text-xs text-right tabular-nums px-1.5"
          type="number"
          step="0.1"
          min="0"
          max="100"
        />
      </div>

      {/* Personalization Toggle */}
      <div
        className="w-10 flex justify-center shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          checked={item.personalization_enabled}
          onCheckedChange={togglePersonalization}
          className="scale-75"
        />
      </div>

      {/* Status */}
      <div className="w-14 text-center shrink-0">
        <button onClick={toggleActive} className="w-full">
          {item.active ? (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground"
            >
              Hidden
            </Badge>
          )}
        </button>
      </div>

      {/* Actions menu */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={resetOverrides}>
              <RotateCcw className="w-3 h-3 mr-2" /> Reset overrides
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
