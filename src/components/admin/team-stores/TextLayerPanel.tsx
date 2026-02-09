import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trash2, Type } from "lucide-react";
import {
  type TextLayer,
  type TextLayerSource,
  TEXT_SOURCE_LABELS,
  FONT_OPTIONS,
  resolveTextContent,
  applyTextTransform,
} from "@/lib/textLayers";

interface Props {
  layer: TextLayer;
  idx: number;
  onUpdate: (idx: number, updates: Partial<TextLayer>) => void;
  onDelete: (idx: number) => void;
}

export function TextLayerPanel({ layer, idx, onUpdate, onDelete }: Props) {
  const previewText = applyTextTransform(resolveTextContent(layer), layer.text_transform);

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded bg-muted border flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            fontFamily: layer.font_family,
            fontWeight: layer.font_weight,
            color: layer.fill_color,
            fontSize: "14px",
            WebkitTextStroke: layer.outline_thickness > 0 ? `${Math.min(layer.outline_thickness, 1)}px ${layer.outline_color || "#000"}` : undefined,
          }}
        >
          <Type className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{TEXT_SOURCE_LABELS[layer.source]}</p>
          <p className="text-[11px] text-muted-foreground truncate">{previewText}</p>
        </div>
        {!layer.active && <Badge variant="destructive" className="text-[8px]">Off</Badge>}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(idx)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Source */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Source</Label>
          <Select value={layer.source} onValueChange={(v) => onUpdate(idx, { source: v as TextLayerSource })}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TEXT_SOURCE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Static text input */}
        {layer.source === "static_text" && (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Text</Label>
            <Input
              className="h-8 text-xs"
              value={layer.static_text || ""}
              onChange={(e) => onUpdate(idx, { static_text: e.target.value })}
              placeholder="Enter text…"
            />
          </div>
        )}

        {/* Pattern input for template */}
        {layer.source === "name_number_template" && (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Pattern</Label>
            <Input
              className="h-8 text-xs"
              value={layer.text_pattern || ""}
              onChange={(e) => onUpdate(idx, { text_pattern: e.target.value })}
              placeholder="{LAST_NAME} {NUMBER}"
            />
          </div>
        )}
      </div>

      {/* Font & styling */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Font</Label>
          <Select value={layer.font_family} onValueChange={(v) => onUpdate(idx, { font_family: v })}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  <span style={{ fontFamily: f }}>{f}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Weight</Label>
          <Select value={layer.font_weight} onValueChange={(v) => onUpdate(idx, { font_weight: v })}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="900">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Transform</Label>
          <Select value={layer.text_transform} onValueChange={(v) => onUpdate(idx, { text_transform: v })}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Fill</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={layer.fill_color}
              onChange={(e) => onUpdate(idx, { fill_color: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer p-0"
            />
            <Input
              className="h-8 text-[10px] flex-1"
              value={layer.fill_color}
              onChange={(e) => onUpdate(idx, { fill_color: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Outline</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={layer.outline_color || "#000000"}
              onChange={(e) => onUpdate(idx, { outline_color: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer p-0"
            />
            <Input
              className="h-8 text-[10px] flex-1"
              value={layer.outline_color || "#000000"}
              onChange={(e) => onUpdate(idx, { outline_color: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Outline Width</Label>
          <Slider
            min={0}
            max={6}
            step={0.5}
            value={[layer.outline_thickness]}
            onValueChange={([v]) => onUpdate(idx, { outline_thickness: v })}
            className="mt-2"
          />
          <span className="text-[10px] text-muted-foreground">{layer.outline_thickness}px</span>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Letter Spacing</Label>
          <Slider
            min={-2}
            max={10}
            step={0.5}
            value={[layer.letter_spacing]}
            onValueChange={([v]) => onUpdate(idx, { letter_spacing: v })}
            className="mt-2"
          />
          <span className="text-[10px] text-muted-foreground">{layer.letter_spacing}px</span>
        </div>
      </div>

      {/* Preview swatch */}
      <div className="rounded-md bg-muted/50 border px-3 py-2 flex items-center justify-center min-h-[40px]">
        <span
          style={{
            fontFamily: layer.font_family,
            fontWeight: layer.font_weight,
            fontSize: "20px",
            color: layer.fill_color,
            letterSpacing: `${layer.letter_spacing}px`,
            WebkitTextStroke: layer.outline_thickness > 0 ? `${layer.outline_thickness}px ${layer.outline_color || "#000"}` : undefined,
            textTransform: layer.text_transform as any,
          }}
        >
          {previewText}
        </span>
      </div>

      {/* Active toggle + scale readout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={layer.active} onCheckedChange={(v) => onUpdate(idx, { active: v })} />
          <Label className="text-[11px]">Active</Label>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          x:{layer.x.toFixed(2)} y:{layer.y.toFixed(2)} scale:{Math.round(layer.scale * 100)}%
        </span>
      </div>
    </div>
  );
}
