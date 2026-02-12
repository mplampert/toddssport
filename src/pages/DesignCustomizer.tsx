import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { loadGoogleFont } from "@/components/admin/art-library/GoogleFontPicker";
import { discoverTextBlocks, discoverColors, type TextBlock } from "@/components/admin/art-library/svg-editor/utils";
import { BuilderCanvas } from "@/components/admin/art-library/svg-editor/BuilderCanvas";
import { PublicBuilderPanel } from "@/components/designs/PublicBuilderPanel";
import { useInquiryCart } from "@/hooks/useInquiryCart";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Render SVG string to a PNG blob via offscreen canvas */
async function svgToPng(svgString: string, width = 1024, height = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("PNG conversion failed"));
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG image load failed")); };
    img.src = url;
  });
}

/** Fetch Google Font CSS and inline font binaries as base64 data URIs */
async function inlineFontsIntoSvg(svgEl: SVGSVGElement, fonts: Set<string>): Promise<void> {
  if (fonts.size === 0) return;
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?${Array.from(fonts).map(f => `family=${f.replace(/ /g, "+")}`).join("&")}`;
    const cssResp = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    let css = await cssResp.text();
    const urlRegex = /url\((https:\/\/[^)]+)\)/g;
    const matches = [...css.matchAll(urlRegex)];
    for (const match of matches) {
      try {
        const fontResp = await fetch(match[1]);
        const blob = await fontResp.blob();
        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        css = css.replace(match[0], `url(${dataUri})`);
      } catch { /* skip */ }
    }
    let defs = svgEl.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgEl.prepend(defs);
    }
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    defs.prepend(style);
  } catch { /* best-effort */ }
}

async function svgToPngWithFonts(svgEl: SVGSVGElement, fonts: Set<string>, w = 1024, h = 1024): Promise<Blob> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  await inlineFontsIntoSvg(clone, fonts);
  const serialized = new XMLSerializer().serializeToString(clone);
  return svgToPng(serialized, w, h);
}

interface TemplateRow {
  id: string;
  code: string;
  name: string;
  svg_url_master: string | null;
  school_font: string;
  mascot_font: string;
  supported_fonts: string[];
  color_slots: string[];
  default_colors: Record<string, string> | null;
  image_url: string | null;
}

export default function DesignCustomizer() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addItem } = useInquiryCart();

  const { data: template, isLoading } = useQuery({
    queryKey: ["public-design-template", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_templates")
        .select("*")
        .eq("code", code!)
        .eq("active", true)
        .single();
      if (error) throw error;
      return data as unknown as TemplateRow;
    },
    enabled: !!code,
  });

  const colorSlots = template?.color_slots ?? ["primary", "secondary"];
  const defaultColors = template?.default_colors ?? {};

  const [colors, setColors] = useState<Record<string, string>>({});
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [textFonts, setTextFonts] = useState<Record<string, string>>({});
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isAddingToQuote, setIsAddingToQuote] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const colorElementsRef = useRef<Record<string, Element[]>>({});

  // Load fonts
  useEffect(() => {
    if (!template) return;
    const fonts = new Set<string>([
      ...(template.supported_fonts ?? []),
      template.school_font,
      template.mascot_font,
    ]);
    fonts.forEach((f) => { if (f) loadGoogleFont(f); });
  }, [template]);

  // Load SVG
  useEffect(() => {
    if (!svgContainerRef.current || !template?.svg_url_master) return;
    let cancelled = false;
    fetch(template.svg_url_master)
      .then((r) => r.text())
      .then((svgText) => {
        if (cancelled || !svgContainerRef.current) return;
        svgContainerRef.current.innerHTML = svgText;
        const svgEl = svgContainerRef.current.querySelector("svg");
        if (!svgEl) return;
        svgEl.setAttribute("width", "100%");
        svgEl.setAttribute("height", "100%");
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgEl.style.maxWidth = "100%";
        svgEl.style.maxHeight = "100%";
        svgEl.style.display = "block";

        const blocks = discoverTextBlocks(svgEl);
        setTextBlocks(blocks);
        const vals: Record<string, string> = {};
        const fnts: Record<string, string> = {};
        blocks.forEach((b) => {
          vals[b.id] = b.defaultText;
          fnts[b.id] = b.font;
          loadGoogleFont(b.font);
        });
        setTextValues(vals);
        setTextFonts(fnts);

        const discovered = discoverColors(svgEl);
        if (discovered.length > 0) {
          const newColors: Record<string, string> = {};
          const elMap: Record<string, Element[]> = {};
          discovered.forEach((dc, idx) => {
            const slot = colorSlots[idx] ?? `color-${idx}`;
            newColors[slot] = defaultColors[slot] || dc.hex;
            elMap[slot] = dc.elements.map((e) => e.el);
          });
          colorSlots.forEach((slot) => {
            if (!newColors[slot]) newColors[slot] = defaultColors[slot] || "#000000";
          });
          setColors(newColors);
          colorElementsRef.current = elMap;
        } else {
          const init: Record<string, string> = {};
          colorSlots.forEach((s) => { init[s] = defaultColors[s] || "#000000"; });
          setColors(init);
        }
      })
      .catch(() => toast.error("Failed to load design template"));
    return () => { cancelled = true; };
  }, [template?.svg_url_master]);

  // Live update SVG
  const updateSvg = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    textBlocks.forEach((block) => {
      const el = svg.querySelector(`#${block.id}`) as SVGTextElement | null;
      if (!el) return;
      const newText = textValues[block.id] ?? block.defaultText;
      const font = textFonts[block.id] ?? block.font;
      const tspans = el.querySelectorAll("tspan");
      if (tspans.length > 0) {
        tspans[0].textContent = newText;
        for (let i = 1; i < tspans.length; i++) tspans[i].textContent = "";
        tspans.forEach((tspan) => {
          tspan.setAttribute("font-family", font);
          (tspan as SVGElement).style.fontFamily = font;
        });
      } else {
        el.textContent = newText;
      }
      el.setAttribute("font-family", font);
      el.style.fontFamily = font;
    });

    colorSlots.forEach((slot) => {
      const color = colors[slot];
      if (!svgContainerRef.current) return;
      const svgInner = svgContainerRef.current.querySelector("svg");
      if (!svgInner) return;
      svgInner.querySelectorAll(`.${slot}-fill`).forEach((el) => {
        (el as SVGElement).style.fill = color;
      });
      svgInner.querySelectorAll(`.${slot}-stroke`).forEach((el) => {
        (el as SVGElement).style.stroke = color;
      });
      const els = colorElementsRef.current[slot];
      if (els) els.forEach((el) => { (el as SVGElement).style.fill = color; });
    });
  }, [textBlocks, textValues, textFonts, colors, colorSlots]);

  useEffect(() => { updateSvg(); }, [updateSvg]);

  const setTextValue = (id: string, value: string) => setTextValues((prev) => ({ ...prev, [id]: value }));
  const setTextFont = (id: string, font: string) => { loadGoogleFont(font); setTextFonts((prev) => ({ ...prev, [id]: font })); };
  const setColor = (slot: string, value: string) => setColors((prev) => ({ ...prev, [slot]: value }));

  const getUsedFonts = (): Set<string> => {
    const fonts = new Set<string>();
    textBlocks.forEach((b) => {
      const font = textFonts[b.id] ?? b.font;
      if (font) fonts.add(font);
    });
    return fonts;
  };

  const handleDragText = useCallback(() => {}, []);

  const handleCenterH = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const vb = svg.viewBox?.baseVal;
    const centerX = vb && vb.width > 0 ? vb.x + vb.width / 2 : 250;
    el.setAttribute("x", String(centerX));
    el.setAttribute("text-anchor", "middle");
    el.querySelectorAll("tspan").forEach((tspan) => {
      if (tspan.hasAttribute("x")) {
        tspan.setAttribute("x", String(centerX));
        tspan.setAttribute("text-anchor", "middle");
      }
    });
  }, [selectedTextId]);

  const handleCenterV = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const vb = svg.viewBox?.baseVal;
    const centerY = vb && vb.height > 0 ? vb.y + vb.height / 2 : 250;
    const bbox = el.getBBox();
    el.setAttribute("y", String(centerY + bbox.height / 3));
  }, [selectedTextId]);

  const handleScaleUp = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    const el = svg?.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const cur = parseFloat(el.getAttribute("font-size") || window.getComputedStyle(el).fontSize || "48");
    const ns = Math.min(400, Math.round(cur * 1.15));
    el.setAttribute("font-size", String(ns));
    el.style.fontSize = `${ns}px`;
    el.querySelectorAll("tspan").forEach((t) => { t.setAttribute("font-size", String(ns)); (t as SVGElement).style.fontSize = `${ns}px`; });
  }, [selectedTextId]);

  const handleScaleDown = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    const el = svg?.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const cur = parseFloat(el.getAttribute("font-size") || window.getComputedStyle(el).fontSize || "48");
    const ns = Math.max(8, Math.round(cur * 0.85));
    el.setAttribute("font-size", String(ns));
    el.style.fontSize = `${ns}px`;
    el.querySelectorAll("tspan").forEach((t) => { t.setAttribute("font-size", String(ns)); (t as SVGElement).style.fontSize = `${ns}px`; });
  }, [selectedTextId]);

  // Add to inquiry cart
  const handleAddToQuote = async () => {
    if (!template) return;
    setIsAddingToQuote(true);
    try {
      const svgEl = svgContainerRef.current?.querySelector("svg");
      if (!svgEl) throw new Error("No design to capture");

      // Generate PNG preview
      const pngBlob = await svgToPngWithFonts(svgEl, getUsedFonts(), 512, 512);

      // Upload to storage
      const timestamp = Date.now();
      const path = `inquiry-previews/${template.code}-${timestamp}.png`;
      const { error: upErr } = await supabase.storage
        .from("team-art")
        .upload(path, pngBlob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("team-art").getPublicUrl(path);
      const previewUrl = urlData.publicUrl;

      // Build description from text values
      const textSummary = textBlocks.map((b) => {
        const val = textValues[b.id] ?? b.defaultText;
        return `${b.label}: "${val}"`;
      }).join(", ");

      const colorSummary = colorSlots.map((s) => `${s}: ${colors[s]}`).join(", ");

      addItem({
        productId: `design-${template.code}-${timestamp}`,
        name: `Custom Design — ${template.code}`,
        brand: "Art Library",
        sourceSku: template.code,
        color: colorSummary,
        imageUrl: previewUrl,
        productUrl: `${window.location.origin}/designs/${template.code}`,
      });

      toast.success("Design added to your quote!", {
        description: `${textSummary}`,
      });
    } catch (err: any) {
      toast.error("Failed to add design", { description: err.message });
    } finally {
      setIsAddingToQuote(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Loading design…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!template) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Design Not Found</h1>
          <p className="text-muted-foreground mb-6">This design template doesn't exist or is no longer available.</p>
          <Link to="/designs">
            <Button>Browse All Designs</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  if (!template.svg_url_master) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{template.name}</h1>
          <p className="text-muted-foreground mb-6">This design is not yet available for customization. Contact us to get started!</p>
          <div className="flex gap-3 justify-center">
            <Link to="/designs"><Button variant="outline">Browse Designs</Button></Link>
            <Link to="/contact"><Button>Contact Us</Button></Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Customize {template.name} | Todd's Sporting Goods</title>
        <meta name="description" content={`Customize the ${template.name} design with your team name, colors, and fonts. Add to your quote request.`} />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/designs">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Designs
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{template.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">{template.code}</p>
          </div>
        </div>

        {/* Builder layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4" style={{ minHeight: "calc(100vh - 14rem)" }}>
          {/* Canvas */}
          <div className="border border-border rounded-xl overflow-hidden" style={{ minHeight: 400 }}>
            <BuilderCanvas
              svgContainerRef={svgContainerRef as React.RefObject<HTMLDivElement>}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              onDragText={handleDragText}
              textBlocks={textBlocks}
            />
          </div>

          {/* Side panel */}
          <div className="overflow-hidden">
            <PublicBuilderPanel
              textBlocks={textBlocks}
              selectedTextId={selectedTextId}
              textValues={textValues}
              textFonts={textFonts}
              onTextChange={setTextValue}
              onFontChange={setTextFont}
              onSelectText={setSelectedTextId}
              colorSlots={colorSlots}
              colors={colors}
              onColorChange={setColor}
              onAddToQuote={handleAddToQuote}
              isAddingToQuote={isAddingToQuote}
              onCenterH={handleCenterH}
              onCenterV={handleCenterV}
              onScaleUp={handleScaleUp}
              onScaleDown={handleScaleDown}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
