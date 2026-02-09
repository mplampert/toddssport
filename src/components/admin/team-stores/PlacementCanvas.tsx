import React, { useRef, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { handleImageError } from "@/lib/productImages";

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
  is_primary: boolean;
  variant_color: string | null;
  variant_size: string | null;
  _logo_name?: string;
  _logo_url?: string;
}

interface CanvasProps {
  image: string;
  placements: LogoPlacement[];
  presetMap: Map<string, DecorationPlacement>;
  activeIdx: number | null;
  maxScaleFn: (code: string) => number;
  onSelectPlacement: (idx: number) => void;
  onMovePlacement: (idx: number, x: number, y: number) => void;
  onScalePlacement: (idx: number, scale: number) => void;
}

export function PlacementCanvas({ image, placements, presetMap, activeIdx, maxScaleFn, onSelectPlacement, onMovePlacement, onScalePlacement }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<
    | { type: "drag"; idx: number; offsetX: number; offsetY: number }
    | { type: "resize"; idx: number; startScale: number; startDist: number }
    | null
  >(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectPlacement(idx);

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const p = placements[idx];

    const pointerX = (e.clientX - rect.left) / rect.width;
    const pointerY = (e.clientY - rect.top) / rect.height;
    interactionRef.current = {
      type: "drag",
      idx,
      offsetX: pointerX - p.x,
      offsetY: pointerY - p.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelectPlacement, placements]);

  const handleResizeDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const p = placements[idx];
    const centerPx = { x: p.x * rect.width, y: p.y * rect.height };
    const dist = Math.hypot(e.clientX - rect.left - centerPx.x, e.clientY - rect.top - centerPx.y);

    interactionRef.current = {
      type: "resize",
      idx,
      startScale: p.scale,
      startDist: dist,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactionRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const interaction = interactionRef.current;

    if (interaction.type === "drag") {
      const rawX = (e.clientX - rect.left) / rect.width - interaction.offsetX;
      const rawY = (e.clientY - rect.top) / rect.height - interaction.offsetY;
      const x = Math.max(0.02, Math.min(0.98, rawX));
      const y = Math.max(0.02, Math.min(0.98, rawY));
      onMovePlacement(interaction.idx, x, y);
    } else if (interaction.type === "resize") {
      const p = placements[interaction.idx];
      const centerPx = { x: p.x * rect.width, y: p.y * rect.height };
      const dist = Math.hypot(e.clientX - rect.left - centerPx.x, e.clientY - rect.top - centerPx.y);
      const ratio = dist / interaction.startDist;
      const maxScale = maxScaleFn(p.position);
      const newScale = Math.max(0.03, Math.min(maxScale, interaction.startScale * ratio));
      onScalePlacement(interaction.idx, newScale);
    }
  }, [onMovePlacement, onScalePlacement, placements, maxScaleFn]);

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted/20 border-2 border-dashed border-muted-foreground/15 rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: "4/5", maxHeight: "420px" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Garment image */}
      {image ? (
        <img
          src={image}
          alt="Garment"
          className="w-full h-full object-contain p-6 pointer-events-none"
          draggable={false}
          onError={handleImageError}
        />
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
                      onPointerDown={(e) => handleResizeDown(e, idx)}
                      className="absolute w-3 h-3 bg-accent border-2 border-background rounded-sm z-20"
                      style={pos[corner]}
                    />
                  );
                })}
                {/* Label */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                  {presetMap.get(p.position)?.label || p.position}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Empty state overlay */}
      {placements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground/40">Add a logo to start designing</p>
        </div>
      )}
    </div>
  );
}
