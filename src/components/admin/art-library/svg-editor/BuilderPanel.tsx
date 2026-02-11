import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Type, Palette, FolderOpen, Download } from "lucide-react";
import { GoogleFontPicker } from "../GoogleFontPicker";
import type { TextBlock } from "./utils";
import { SLOT_LABELS } from "./utils";

interface BuilderPanelProps {
  // Text
  textBlocks: TextBlock[];
  selectedTextId: string | null;
  textValues: Record<string, string>;
  textFonts: Record<string, string>;
  onTextChange: (id: string, value: string) => void;
  onFontChange: (id: string, font: string) => void;
  onSelectText: (id: string | null) => void;

  // Colors
  colorSlots: string[];
  colors: Record<string, string>;
  onColorChange: (slot: string, value: string) => void;

  // Save
  teamStores: { id: string; name: string; organization: string | null }[] | undefined;
  selectedTeamStoreId: string;
  onTeamStoreChange: (id: string) => void;
  onSave: () => void;
  isSaving: boolean;

  // Download
  onDownload: () => void;
  isDownloading: boolean;
}

export function BuilderPanel({
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
  teamStores,
  selectedTeamStoreId,
  onTeamStoreChange,
  onSave,
  isSaving,
  onDownload,
  isDownloading,
}: BuilderPanelProps) {
  const selectedBlock = textBlocks.find((b) => b.id === selectedTextId);

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto">
      {/* TEXT SECTION */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Type className="w-4 h-4 text-accent" />
          Text Layers
        </div>

        {/* Text block tabs */}
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

        {/* Selected block editor */}
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

      {/* DOWNLOAD SECTION */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Download className="w-4 h-4 text-accent" />
          Logo Package
        </div>
        <p className="text-xs text-muted-foreground">
          Download ZIP with SVG, hi-res PNG, font &amp; color info
        </p>
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          variant="outline"
          className="w-full gap-2 h-9"
          size="sm"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download Package
        </Button>
      </div>

      {/* SAVE SECTION */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3 mt-auto">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderOpen className="w-4 h-4 text-accent" />
          Save to Team Logos
        </div>
        <p className="text-xs text-muted-foreground">
          Saves SVG + PNG to the team's logo library for use on products
        </p>
        <Select value={selectedTeamStoreId} onValueChange={onTeamStoreChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select a team store…" />
          </SelectTrigger>
          <SelectContent>
            {teamStores?.map((ts) => (
              <SelectItem key={ts.id} value={ts.id}>
                {ts.name}{ts.organization ? ` — ${ts.organization}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={onSave}
          disabled={isSaving || !selectedTeamStoreId}
          className="w-full gap-2 h-9"
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save to Logo Library
        </Button>
      </div>
    </div>
  );
}
