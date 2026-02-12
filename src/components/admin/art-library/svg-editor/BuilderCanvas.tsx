import { useRef, useEffect, useCallback } from "react";
import type { TextBlock } from "./utils";

type InteractionMode = "idle" | "drag" | "resize";

interface BuilderCanvasProps {
  svgContainerRef: React.RefObject<HTMLDivElement>;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  onDragText: (id: string, dx: number, dy: number) => void;
  onScaleText?: (id: string, scale: number) => void;
  textBlocks: TextBlock[];
}

/** Get the SVG viewBox dimensions */
function getViewBox(svg: SVGSVGElement): { x: number; y: number; w: number; h: number } {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  const w = svg.width.baseVal.value || 500;
  const h = svg.height.baseVal.value || 500;
  return { x: 0, y: 0, w, h };
}

export function BuilderCanvas({
  svgContainerRef,
  selectedTextId,
  onSelectText,
  onDragText,
  onScaleText,
  textBlocks,
}: BuilderCanvasProps) {
  const modeRef = useRef<InteractionMode>("idle");
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; fontSize: number } | null>(null);
  const targetIdRef = useRef<string | null>(null);

  // Style text elements
  useEffect(() => {
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;

    textBlocks.forEach((block) => {
      const el = svg.querySelector(`#${block.id}`) as SVGTextElement | null;
      if (!el) return;
      el.style.cursor = "move";
      if (block.id === selectedTextId) {
        el.style.outline = "2px dashed hsl(199 89% 48%)";
        el.style.outlineOffset = "4px";
      } else {
        el.style.outline = "none";
      }
    });

    // Add/update resize handles overlay
    updateResizeHandles(svg, selectedTextId);
  }, [textBlocks, selectedTextId, svgContainerRef]);

  function updateResizeHandles(svg: SVGSVGElement, selId: string | null) {
    // Remove existing handles
    svg.querySelectorAll(".resize-handle-group").forEach((g) => g.remove());
    if (!selId) return;

    const el = svg.querySelector(`#${selId}`) as SVGTextElement | null;
    if (!el) return;

    const localBBox = el.getBBox();
    if (!localBBox || localBBox.width === 0) return;

    // Transform bbox from element's local coordinate space to SVG root space
    const elCTM = el.getCTM();
    const svgCTM = svg.getCTM();
    if (!elCTM || !svgCTM) return;
    const relativeCTM = svgCTM.inverse().multiply(elCTM);

    const transformPoint = (x: number, y: number) => {
      const pt = svg.createSVGPoint();
      pt.x = x; pt.y = y;
      const tp = pt.matrixTransform(relativeCTM);
      return { x: tp.x, y: tp.y };
    };

    const tl = transformPoint(localBBox.x, localBBox.y);
    const br = transformPoint(localBBox.x + localBBox.width, localBBox.y + localBBox.height);
    const bbox = { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y };

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("resize-handle-group");
    g.setAttribute("pointer-events", "all");

    // Selection rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(bbox.x - 4));
    rect.setAttribute("y", String(bbox.y - 4));
    rect.setAttribute("width", String(bbox.width + 8));
    rect.setAttribute("height", String(bbox.height + 8));
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "hsl(199 89% 48%)");
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("stroke-dasharray", "4 2");
    rect.setAttribute("pointer-events", "none");
    g.appendChild(rect);

    // Corner resize handles
    const handleSize = Math.max(6, Math.min(12, bbox.width * 0.03));
    const corners = [
      { cx: bbox.x - 4, cy: bbox.y - 4 },
      { cx: bbox.x + bbox.width + 4, cy: bbox.y - 4 },
      { cx: bbox.x - 4, cy: bbox.y + bbox.height + 4 },
      { cx: bbox.x + bbox.width + 4, cy: bbox.y + bbox.height + 4 },
    ];

    corners.forEach((pos) => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      handle.setAttribute("x", String(pos.cx - handleSize / 2));
      handle.setAttribute("y", String(pos.cy - handleSize / 2));
      handle.setAttribute("width", String(handleSize));
      handle.setAttribute("height", String(handleSize));
      handle.setAttribute("fill", "white");
      handle.setAttribute("stroke", "hsl(199 89% 48%)");
      handle.setAttribute("stroke-width", "1.5");
      handle.setAttribute("rx", "1");
      handle.style.cursor = "nwse-resize";
      handle.classList.add("resize-handle");
      g.appendChild(handle);
    });

    svg.appendChild(g);
  }

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

    // Check if clicking a resize handle
    if (target.classList.contains("resize-handle") && selectedTextId) {
      modeRef.current = "resize";
      targetIdRef.current = selectedTextId;
      const pt = getSvgPoint(e);
      const svg = svgContainerRef.current?.querySelector("svg");
      const textEl = svg?.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
      if (pt && textEl) {
        const currentSize = parseFloat(window.getComputedStyle(textEl).fontSize) || 
          parseFloat(textEl.getAttribute("font-size") || "48");
        resizeStartRef.current = { x: pt.x, y: pt.y, fontSize: currentSize };
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Walk up to find text element
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
        modeRef.current = "drag";
        targetIdRef.current = id;
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
  }, [onSelectText, getSvgPoint, selectedTextId, svgContainerRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e);
    if (!pt || !targetIdRef.current) return;

    if (modeRef.current === "drag" && dragStartRef.current) {
      const dx = pt.x - dragStartRef.current.x;
      const dy = pt.y - dragStartRef.current.y;
      const svg = svgContainerRef.current?.querySelector("svg");
      if (!svg) return;
      const el = svg.querySelector(`#${targetIdRef.current}`) as SVGTextElement | null;
      if (!el) return;
      el.setAttribute("x", String(dragStartRef.current.elX + dx));
      el.setAttribute("y", String(dragStartRef.current.elY + dy));
      el.querySelectorAll("tspan").forEach((tspan) => {
        if (tspan.hasAttribute("x")) {
          if (!tspan.dataset.origX) tspan.dataset.origX = tspan.getAttribute("x") || "0";
          tspan.setAttribute("x", String(parseFloat(tspan.dataset.origX) + dx));
        }
        if (tspan.hasAttribute("y")) {
          if (!tspan.dataset.origY) tspan.dataset.origY = tspan.getAttribute("y") || "0";
          tspan.setAttribute("y", String(parseFloat(tspan.dataset.origY) + dy));
        }
      });
      // Keep handles in sync during drag
      updateResizeHandles(svg, targetIdRef.current);
    }

    if (modeRef.current === "resize" && resizeStartRef.current) {
      const svg = svgContainerRef.current?.querySelector("svg");
      if (!svg) return;
      const el = svg.querySelector(`#${targetIdRef.current}`) as SVGTextElement | null;
      if (!el) return;

      // Scale based on horizontal drag distance — wide range allowed
      const dx = pt.x - resizeStartRef.current.x;
      const vb = getViewBox(svg);
      const dy = pt.y - resizeStartRef.current.y;
      const scaleFactor = 1 + (-dy / (vb.w * 0.15));
      const newSize = Math.max(2, Math.min(2000, resizeStartRef.current.fontSize * scaleFactor));

      el.setAttribute("font-size", String(Math.round(newSize)));
      el.style.fontSize = `${Math.round(newSize)}px`;
      el.querySelectorAll("tspan").forEach((tspan) => {
        tspan.setAttribute("font-size", String(Math.round(newSize)));
        (tspan as SVGElement).style.fontSize = `${Math.round(newSize)}px`;
      });

      // Update handles position
      updateResizeHandles(svg, targetIdRef.current);
    }
  }, [getSvgPoint, svgContainerRef]);

  const handleMouseUp = useCallback(() => {
    if (modeRef.current === "drag" && targetIdRef.current) {
      const svg = svgContainerRef.current?.querySelector("svg");
      if (svg) {
        const el = svg.querySelector(`#${targetIdRef.current}`) as SVGTextElement | null;
        if (el) {
          el.querySelectorAll("tspan").forEach((tspan) => {
            delete tspan.dataset.origX;
            delete tspan.dataset.origY;
          });
        }
      }
    }
    if (modeRef.current === "resize" && targetIdRef.current) {
      // Refresh handles after resize
      const svg = svgContainerRef.current?.querySelector("svg");
      if (svg) updateResizeHandles(svg, targetIdRef.current);
    }
    modeRef.current = "idle";
    dragStartRef.current = null;
    resizeStartRef.current = null;
    targetIdRef.current = null;
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
      {!selectedTextId && textBlocks.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground shadow-sm pointer-events-none">
          Click text to select · Drag to move · Corner handles to resize
        </div>
      )}
    </div>
  );
}
