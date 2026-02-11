import { useRef, useEffect, useCallback, useState } from "react";
import type { TextBlock } from "./utils";

interface BuilderCanvasProps {
  svgContainerRef: React.RefObject<HTMLDivElement>;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  onDragText: (id: string, dx: number, dy: number) => void;
  textBlocks: TextBlock[];
}

export function BuilderCanvas({
  svgContainerRef,
  selectedTextId,
  onSelectText,
  onDragText,
  textBlocks,
}: BuilderCanvasProps) {
  const isDragging = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);
  const dragTargetRef = useRef<string | null>(null);

  // Add click & drag handlers to text elements
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Style text elements to be interactive
    textBlocks.forEach((block) => {
      const el = svg.querySelector(`#${block.id}`) as SVGTextElement | null;
      if (!el) return;
      el.style.cursor = "move";
      // Highlight selected
      if (block.id === selectedTextId) {
        el.style.outline = "2px dashed hsl(199 89% 48%)";
        el.style.outlineOffset = "4px";
      } else {
        el.style.outline = "none";
      }
    });
  }, [textBlocks, selectedTextId, svgContainerRef]);

  const getSvgPoint = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return {
      x: (e.clientX - ctm.e) / ctm.a,
      y: (e.clientY - ctm.f) / ctm.d,
    };
  }, [svgContainerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    // Walk up to find a text element
    let textEl: SVGTextElement | null = null;
    let current: Element | null = target;
    while (current && current.tagName !== "svg") {
      if (current.tagName === "text" || current.tagName === "TEXT") {
        textEl = current as SVGTextElement;
        break;
      }
      current = current.parentElement;
    }

    if (textEl) {
      const id = textEl.getAttribute("id");
      if (id) {
        onSelectText(id);
        isDragging.current = true;
        dragTargetRef.current = id;
        const pt = getSvgPoint(e);
        const elX = parseFloat(textEl.getAttribute("x") || "0");
        const elY = parseFloat(textEl.getAttribute("y") || "0");
        if (pt) {
          dragStartRef.current = { x: pt.x, y: pt.y, elX, elY };
        }
        e.preventDefault();
      }
    } else {
      onSelectText(null);
    }
  }, [onSelectText, getSvgPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !dragStartRef.current || !dragTargetRef.current) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    const dx = pt.x - dragStartRef.current.x;
    const dy = pt.y - dragStartRef.current.y;

    // Move text element directly for responsiveness
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${dragTargetRef.current}`) as SVGTextElement | null;
    if (!el) return;
    el.setAttribute("x", String(dragStartRef.current.elX + dx));
    el.setAttribute("y", String(dragStartRef.current.elY + dy));
    // Also move tspans
    el.querySelectorAll("tspan").forEach((tspan) => {
      const tx = parseFloat(tspan.getAttribute("x") || "0");
      // Only update x if tspan has its own x
      if (tspan.hasAttribute("x")) {
        // For first move, store original
        if (!tspan.dataset.origX) tspan.dataset.origX = String(tx);
        tspan.setAttribute("x", String(parseFloat(tspan.dataset.origX) + dx));
      }
    });
  }, [getSvgPoint, svgContainerRef]);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current && dragStartRef.current && dragTargetRef.current) {
      const svg = svgContainerRef.current?.querySelector("svg");
      if (svg) {
        const el = svg.querySelector(`#${dragTargetRef.current}`) as SVGTextElement | null;
        if (el) {
          // Clean up tspan data attributes
          el.querySelectorAll("tspan").forEach((tspan) => {
            delete tspan.dataset.origX;
          });
        }
      }
    }
    isDragging.current = false;
    dragStartRef.current = null;
    dragTargetRef.current = null;
  }, [svgContainerRef]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-muted/20 rounded-xl overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={svgContainerRef}
        className="w-full h-full flex items-center justify-center p-6"
        style={{ minHeight: 400 }}
      />
      {/* Selection hint */}
      {!selectedTextId && textBlocks.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground shadow-sm pointer-events-none">
          Click any text to select &amp; drag to reposition
        </div>
      )}
    </div>
  );
}
