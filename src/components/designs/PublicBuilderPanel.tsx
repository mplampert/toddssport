import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Type, Palette, AlignCenterHorizontal, AlignCenterVertical, Minus, Plus, ShoppingCart } from "lucide-react";
import { GoogleFontPicker } from "@/components/admin/art-library/GoogleFontPicker";
import type { TextBlock } from "@/components/admin/art-library/svg-editor/utils";
import { SLOT_LABELS } from "@/components/admin/art-library/svg-editor/utils";

interface PublicBuilderPanelProps {
  textBlocks: TextBlock[];
  selectedTextId: string | null;
  textValues: Record<string, string>;
  textFonts: Record<string, string>;
  onTextChange: (id: string, value: string) => void;
  onFontChange: (id: string, font: string) => void;
  onSelectText: (id: string | null) => void;
  colorSlots: string[];
  colors: Record<string, string>;
  onColorChange: (slot: string, value: string) => void;
  onAddToQuote: () => void;
  isAddingToQuote: boolean;
  onCenterH?: () => void;
  onCenterV?: () => void;
  onScaleUp?: () => void;
  onScaleDown?: () => void;
}

export function PublicBuilderPanel({
  textBlocks,
  selectedTextId,
  textValues,
  textFonts,
  onTextChange,
  onFontChange,
  onSelectText,
  colorSlots,
  colors,
  onColorChange,
  onAddToQuote,
  isAddingToQuote,
  onCenterH,
  onCenterV,
  onScaleUp,
  onScaleDown,
}: PublicBuilderPanelProps) {
  const selectedBlock = textBlocks.find((b) => b.id === selectedTextId);

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto">
      {/* TEXT SECTION */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4 text-accent" />
          Customize Text
        </div>

        <div className="flex flex-wrap gap-1">
          {textBlocks.map((block) => (
            <button
              key={block.id}
              onClick={() => onSelectText(block.id)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                block.id === selectedTextId
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {block.label}
            </button>
          ))}
        </div>

        {selectedBlock && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div>
              <Label className="text-xs text-muted-foreground">Text</Label>
              <Input
                value={textValues[selectedBlock.id] ?? ""}
                onChange={(e) => onTextChange(selectedBlock.id, e.target.value)}
                placeholder={selectedBlock.defaultText}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font</Label>
              <div className="mt-1">
                <GoogleFontPicker
                  value={textFonts[selectedBlock.id] ?? selectedBlock.font}
                  onChange={(f) => onFontChange(selectedBlock.id, f)}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mr-auto">Position / Size</Label>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={onCenterH} title="Center horizontally">
                <AlignCenterHorizontal className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={onCenterV} title="Center vertically">
                <AlignCenterVertical className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={onScaleDown} title="Scale down">
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={onScaleUp} title="Scale up">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {!selectedBlock && textBlocks.length > 0 && (
          <p className="text-xs text-muted-foreground italic">
            Select a text layer above or click text on the canvas
          </p>
        )}
      </div>

      {/* COLORS SECTION */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="w-4 h-4 text-accent" />
          Colors
        </div>
        <div className="grid grid-cols-2 gap-2">
          {colorSlots.map((slot) => (
            <div key={slot} className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {SLOT_LABELS[slot] || slot.charAt(0).toUpperCase() + slot.slice(1)}
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={colors[slot] || "#000000"}
                  onChange={(e) => onColorChange(slot, e.target.value)}
                  className="w-8 h-8 rounded-md border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={colors[slot] || ""}
                  onChange={(e) => onColorChange(slot, e.target.value)}
                  className="h-8 font-mono text-xs flex-1 min-w-0"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD TO QUOTE */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2 mt-auto">
        <Button
          onClick={onAddToQuote}
          disabled={isAddingToQuote}
          className="w-full gap-2 h-10"
        >
          {isAddingToQuote ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          {isAddingToQuote ? "Adding…" : "Add to Quote"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Add this custom design to your quote request
        </p>
      </div>
    </div>
  );
}
