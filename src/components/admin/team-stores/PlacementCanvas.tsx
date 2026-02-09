import React, { useRef, useCallback, useEffect } from "react";
import { ImageIcon, Trash2, Upload, Loader2, Type } from "lucide-react";
import { handleImageError } from "@/lib/productImages";
import { type TextLayer, resolveTextContent, applyTextTransform } from "@/lib/textLayers";

/* ─── Types ─── */

export interface DecorationPlacement {
  id: string;
  code: string;
  label: string;
  garment_type: string;
  max_width_in: number;
  max_height_in: number;
  default_x: number;
  default_y: number;
  default_scale: number;
  sort_order: number;
}

export interface LogoPlacement {
  id?: string;
  store_logo_id: string;
  store_logo_variant_id: string | null;
  position: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  is_primary: boolean;
  role: string; // "primary" | "secondary" | "sponsor" | "league_patch" | "number_zone" | "other"
  sort_order: number;
  active: boolean;
  variant_color: string | null;
  variant_size: string | null;
  view: string; // "front" | "back" | "left_sleeve" | "right_sleeve"
  _logo_name?: string;
  _logo_url?: string;
}

interface CanvasProps {
  image: string;
  placements: LogoPlacement[];
  textLayers?: TextLayer[];
  presetMap: Map<string, DecorationPlacement>;
  activeIdx: number | null;
  activeTextIdx?: number | null;
  maxScaleFn: (code: string) => number;
  onSelectPlacement: (idx: number) => void;
  onMovePlacement: (idx: number, x: number, y: number) => void;
  onScalePlacement: (idx: number, scale: number) => void;
  onDeletePlacement?: (idx: number) => void;
  onSelectTextLayer?: (idx: number) => void;
  onMoveTextLayer?: (idx: number, x: number, y: number) => void;
  onScaleTextLayer?: (idx: number, scale: number) => void;
  onDeleteTextLayer?: (idx: number) => void;
  /** Personalization context for live text preview */
  personalization?: { name?: string; number?: string; customFields?: Record<string, string> };
  /** When set, shows an upload prompt if `image` is empty (used for sleeve views) */
  onUploadSleeveImage?: (file: File) => void;
  sleeveUploading?: boolean;
  sleeveViewLabel?: string;
}

export function PlacementCanvas({ image, placements, textLayers = [], presetMap, activeIdx, activeTextIdx, maxScaleFn, onSelectPlacement, onMovePlacement, onScalePlacement, onDeletePlacement, onSelectTextLayer, onMoveTextLayer, onScaleTextLayer, onDeleteTextLayer, personalization, onUploadSleeveImage, sleeveUploading, sleeveViewLabel }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sleeveFileRef = useRef<HTMLInputElement>(null);
  const interactionRef = useRef<
    | { type: "drag"; kind: "logo" | "text"; idx: number; offsetX: number; offsetY: number }
    | { type: "resize"; kind: "logo" | "text"; idx: number; startScale: number; startDist: number }
    | null
  >(null);

  // Keyboard Delete/Backspace support for both logos and text layers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (activeTextIdx !== null && activeTextIdx !== undefined && onDeleteTextLayer) {
          e.preventDefault();
          onDeleteTextLayer(activeTextIdx);
        } else if (activeIdx !== null && onDeletePlacement) {
          e.preventDefault();
          onDeletePlacement(activeIdx);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeIdx, activeTextIdx, onDeletePlacement, onDeleteTextLayer]);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlacement(idx);
    // Deselect text
    onSelectTextLayer?.(- 1);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const p = placements[idx];
    const pointerX = (e.clientX - rect.left) / rect.width;
    const pointerY = (e.clientY - rect.top) / rect.height;
    interactionRef.current = {
      type: "drag", kind: "logo", idx,
      offsetX: pointerX - p.x,
      offsetY: pointerY - p.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelectPlacement, onSelectTextLayer, placements]);

  const handleTextPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectTextLayer?.(idx);
    // Deselect logo
    onSelectPlacement(-1);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const t = textLayers[idx];
    const pointerX = (e.clientX - rect.left) / rect.width;
    const pointerY = (e.clientY - rect.top) / rect.height;
    interactionRef.current = {
      type: "drag", kind: "text", idx,
      offsetX: pointerX - t.x,
      offsetY: pointerY - t.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelectTextLayer, onSelectPlacement, textLayers]);

  const handleResizeDown = useCallback((e: React.PointerEvent, idx: number, kind: "logo" | "text" = "logo") => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const item = kind === "logo" ? placements[idx] : textLayers[idx];
    const centerPx = { x: item.x * rect.width, y: item.y * rect.height };
    const dist = Math.hypot(e.clientX - rect.left - centerPx.x, e.clientY - rect.top - centerPx.y);
    interactionRef.current = { type: "resize", kind, idx, startScale: item.scale, startDist: dist };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placements, textLayers]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactionRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const interaction = interactionRef.current;

    if (interaction.type === "drag") {
      const rawX = (e.clientX - rect.left) / rect.width - interaction.offsetX;
      const rawY = (e.clientY - rect.top) / rect.height - interaction.offsetY;
      const x = Math.max(0.02, Math.min(0.98, rawX));
      const y = Math.max(0.02, Math.min(0.98, rawY));
      if (interaction.kind === "logo") onMovePlacement(interaction.idx, x, y);
      else onMoveTextLayer?.(interaction.idx, x, y);
    } else if (interaction.type === "resize") {
      const item = interaction.kind === "logo" ? placements[interaction.idx] : textLayers[interaction.idx];
      const centerPx = { x: item.x * rect.width, y: item.y * rect.height };
      const dist = Math.hypot(e.clientX - rect.left - centerPx.x, e.clientY - rect.top - centerPx.y);
      const ratio = dist / interaction.startDist;
      const maxScale = interaction.kind === "logo" ? maxScaleFn((item as any).position) : 0.8;
      const newScale = Math.max(0.03, Math.min(maxScale, interaction.startScale * ratio));
      if (interaction.kind === "logo") onScalePlacement(interaction.idx, newScale);
      else onScaleTextLayer?.(interaction.idx, newScale);
    }
  }, [onMovePlacement, onScalePlacement, onMoveTextLayer, onScaleTextLayer, placements, textLayers, maxScaleFn]);

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted/20 border-2 border-dashed border-muted-foreground/15 rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: "4/5" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Garment image or sleeve upload prompt */}
      {image ? (
        <img
          src={image}
          alt="Garment"
          className="w-full h-full object-contain pointer-events-none" style={{ padding: "8%" }}
          draggable={false}
          onError={handleImageError}
        />
      ) : onUploadSleeveImage ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8">
          <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            No {sleeveViewLabel || "sleeve"} image yet
          </p>
          <button
            onClick={() => sleeveFileRef.current?.click()}
            disabled={sleeveUploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {sleeveUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload {sleeveViewLabel || "Sleeve"} Image
          </button>
          <p className="text-[11px] text-muted-foreground/60 text-center max-w-[200px]">
            Upload a flat sleeve image to position logos on this view
          </p>
          <input
            ref={sleeveFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadSleeveImage(file);
              if (sleeveFileRef.current) sleeveFileRef.current.value = "";
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-20 h-20 text-muted-foreground/10" />
        </div>
      )}

      {/* Placement zone hint for active placement */}
      {activeIdx !== null && placements[activeIdx] && (() => {
        const preset = presetMap.get(placements[activeIdx].position);
        if (!preset) return null;
        const zoneW = (preset.max_width_in / 16) * 100;
        const zoneH = (preset.max_height_in / 20) * 100;
        return (
          <div
            className="absolute border border-dashed border-accent/30 rounded-md pointer-events-none"
            style={{
              left: `${preset.default_x * 100}%`,
              top: `${preset.default_y * 100}%`,
              width: `${zoneW}%`,
              height: `${zoneH}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-accent/50 whitespace-nowrap">
              {preset.label}
            </span>
          </div>
        );
      })()}

      {/* Logo overlays */}
      {placements.map((p, idx) => {
        if (!p._logo_url) return null;
        const size = p.scale * 100;
        const isActive = activeIdx === idx;
        return (
          <div
            key={idx}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            className={`absolute cursor-grab active:cursor-grabbing rounded ${
              isActive
                ? "ring-2 ring-accent shadow-lg z-10"
                : "z-0 hover:ring-1 hover:ring-muted-foreground/30 opacity-80 hover:opacity-100"
            }`}
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${size}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <img
              src={p._logo_url}
              alt={p._logo_name || "Logo"}
              className="w-full h-auto object-contain pointer-events-none"
              draggable={false}
            />
            {/* Resize handles — only on active logo */}
            {isActive && (
              <>
                {(["nw", "ne", "se", "sw"] as const).map((corner) => {
                  const pos: Record<string, React.CSSProperties> = {
                    nw: { top: -4, left: -4, cursor: "nwse-resize" },
                    ne: { top: -4, right: -4, cursor: "nesw-resize" },
                    se: { bottom: -4, right: -4, cursor: "nwse-resize" },
                    sw: { bottom: -4, left: -4, cursor: "nesw-resize" },
                  };
                  return (
                    <div
                      key={corner}
                      onPointerDown={(e) => handleResizeDown(e, idx, "logo")}
                      className="absolute w-3 h-3 bg-accent border-2 border-background rounded-sm z-20"
                      style={pos[corner]}
                    />
                  );
                })}
                {/* Label */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                  {presetMap.get(p.position)?.label || p.position}
                </div>
                {/* Delete button */}
                {onDeletePlacement && (
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeletePlacement(idx);
                    }}
                    className="absolute -top-3 -right-3 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform"
                    title="Delete placement"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* ─── Text Layer Overlays ─── */}
      {textLayers.map((t, idx) => {
        if (!t.active) return null;
        const rawText = resolveTextContent(t, personalization);
        const displayText = applyTextTransform(rawText, t.text_transform);
        const size = t.scale * 100;
        const isActive = activeTextIdx === idx;
        return (
          <div
            key={`text-${idx}`}
            onPointerDown={(e) => handleTextPointerDown(e, idx)}
            className={`absolute cursor-grab active:cursor-grabbing rounded ${
              isActive
                ? "ring-2 ring-primary shadow-lg z-10"
                : "z-0 hover:ring-1 hover:ring-muted-foreground/30 opacity-80 hover:opacity-100"
            }`}
            style={{
              left: `${t.x * 100}%`,
              top: `${t.y * 100}%`,
              width: `${size}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="w-full text-center whitespace-nowrap overflow-hidden pointer-events-none select-none"
              style={{
                fontFamily: t.font_family,
                fontWeight: t.font_weight,
                fontSize: `${Math.max(8, Math.round(t.font_size_px * (size / 100)))}px`,
                color: t.fill_color,
                letterSpacing: `${t.letter_spacing}px`,
                lineHeight: t.line_height,
                textAlign: t.alignment as any,
                WebkitTextStroke: t.outline_thickness > 0 ? `${t.outline_thickness}px ${t.outline_color || "#000"}` : undefined,
              }}
            >
              {displayText}
            </div>
            {/* Resize handles + delete — only on active text layer */}
            {isActive && (
              <>
                {(["nw", "ne", "se", "sw"] as const).map((corner) => {
                  const pos: Record<string, React.CSSProperties> = {
                    nw: { top: -4, left: -4, cursor: "nwse-resize" },
                    ne: { top: -4, right: -4, cursor: "nesw-resize" },
                    se: { bottom: -4, right: -4, cursor: "nwse-resize" },
                    sw: { bottom: -4, left: -4, cursor: "nesw-resize" },
                  };
                  return (
                    <div
                      key={corner}
                      onPointerDown={(e) => handleResizeDown(e, idx, "text")}
                      className="absolute w-3 h-3 bg-primary border-2 border-background rounded-sm z-20"
                      style={pos[corner]}
                    />
                  );
                })}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm flex items-center gap-1">
                  <Type className="w-2.5 h-2.5" />
                  Text
                </div>
                {onDeleteTextLayer && (
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteTextLayer(idx);
                    }}
                    className="absolute -top-3 -right-3 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform"
                    title="Delete text layer"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Empty state overlay */}
      {placements.length === 0 && textLayers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground/40">Add a logo or text to start designing</p>
        </div>
      )}
    </div>
  );
}
