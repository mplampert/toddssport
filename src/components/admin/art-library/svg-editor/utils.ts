/** Types and utilities for SVG design editor */

export interface TextBlock {
  id: string;
  label: string;
  font: string;
  defaultText: string;
  originalX: number;
  originalY: number;
}

export interface DiscoveredColor {
  hex: string;
  elements: { el: Element; attr: "fill" | "stroke" | "style-fill" | "style-stroke" | "class-fill" }[];
}

/** Introspect SVG DOM for ALL <text> elements and extract font-family + position */
export function discoverTextBlocks(svg: SVGSVGElement): TextBlock[] {
  const blocks: TextBlock[] = [];
  let autoIdx = 0;
  svg.querySelectorAll("text").forEach((el) => {
    let id = el.getAttribute("id") || "";
    if (!id) {
      id = `text-block-${autoIdx++}`;
      el.setAttribute("id", id);
    }
    const computed = window.getComputedStyle(el);
    const font =
      el.getAttribute("font-family") ||
      (el as unknown as HTMLElement).style.fontFamily ||
      computed.fontFamily ||
      "sans-serif";
    const text = el.textContent || "";
    const label = id
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Capture original position
    const x = parseFloat(el.getAttribute("x") || "0");
    const y = parseFloat(el.getAttribute("y") || "0");

    blocks.push({ id, label, font: font.replace(/['"]/g, ""), defaultText: text, originalX: x, originalY: y });
  });
  return blocks;
}

/** Normalise any CSS color to a lowercase hex string */
export function toHex(color: string): string | null {
  if (!color || color === "none" || color === "transparent") return null;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color.toLowerCase();
  const el = document.createElement("div");
  el.style.color = color;
  document.body.appendChild(el);
  const computed = window.getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const hex = "#" + [match[1], match[2], match[3]]
    .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
    .join("");
  return hex.toLowerCase();
}

/** Scan all SVG elements to extract unique fill / stroke colors */
export function discoverColors(svg: SVGSVGElement): DiscoveredColor[] {
  const colorMap = new Map<string, DiscoveredColor["elements"]>();

  const track = (hex: string | null, el: Element, attr: DiscoveredColor["elements"][0]["attr"]) => {
    if (!hex || hex === "#000000" && attr === "class-fill") return;
    if (!colorMap.has(hex)) colorMap.set(hex, []);
    colorMap.get(hex)!.push({ el, attr });
  };

  svg.querySelectorAll("path, rect, circle, ellipse, polygon, polyline, text, tspan, g, line").forEach((el) => {
    const computed = window.getComputedStyle(el);
    const fillAttr = el.getAttribute("fill");
    const fillStyle = (el as SVGElement).style?.fill;
    const fillComputed = computed.fill;
    if (fillAttr && fillAttr !== "none") {
      track(toHex(fillAttr), el, "fill");
    } else if (fillStyle) {
      track(toHex(fillStyle), el, "style-fill");
    } else if (fillComputed && fillComputed !== "none") {
      track(toHex(fillComputed), el, "class-fill");
    }
  });

  return Array.from(colorMap.entries())
    .map(([hex, elements]) => ({ hex, elements }))
    .sort((a, b) => b.elements.length - a.elements.length);
}

export const SLOT_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  accent: "Accent",
};
