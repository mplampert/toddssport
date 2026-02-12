import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import { loadGoogleFont } from "./GoogleFontPicker";
import { discoverTextBlocks, discoverColors, type TextBlock } from "./svg-editor/utils";
import { BuilderCanvas } from "./svg-editor/BuilderCanvas";
import { BuilderPanel } from "./svg-editor/BuilderPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TemplateData {
  id: string;
  code: string;
  name: string;
  svg_url_master: string | null;
  school_font: string;
  mascot_font: string;
  supported_fonts: string[];
  color_slots: string[];
  default_colors: Record<string, string> | null;
}

interface SvgDesignEditorProps {
  template: TemplateData;
  onBack: () => void;
}

/** Fetch Google Font CSS and inline font binaries as base64 data URIs */
async function inlineFontsIntoSvg(svgEl: SVGSVGElement, fonts: Set<string>): Promise<void> {
  if (fonts.size === 0) return;
  try {
    const familyParam = Array.from(fonts).map(f => f.replace(/ /g, "+")).join("|");
    const cssUrl = `https://fonts.googleapis.com/css2?${Array.from(fonts).map(f => `family=${f.replace(/ /g, "+")}`).join("&")}`;
    const cssResp = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    let css = await cssResp.text();
    // Replace each url(...) with a base64 data URI
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
      } catch { /* skip individual font file failures */ }
    }
    // Inject <style> into SVG <defs>
    let defs = svgEl.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgEl.prepend(defs);
    }
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    defs.prepend(style);
  } catch { /* font inlining is best-effort */ }
}

/** Render SVG string to a PNG blob via offscreen canvas */
async function svgToPng(svgString: string, width = 2048, height = 2048): Promise<Blob> {
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

/** Clone SVG, inline fonts, serialize, then render to PNG */
async function svgToPngWithFonts(svgEl: SVGSVGElement, fonts: Set<string>, width = 2048, height = 2048): Promise<Blob> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  await inlineFontsIntoSvg(clone, fonts);
  const serialized = new XMLSerializer().serializeToString(clone);
  return svgToPng(serialized, width, height);
}

export function SvgDesignEditor({ template, onBack }: SvgDesignEditorProps) {
  const colorSlots = template.color_slots ?? ["primary", "secondary"];
  const defaultColors = template.default_colors ?? {};

  const [colors, setColors] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    colorSlots.forEach((slot) => {
      init[slot] = defaultColors[slot] || "#000000";
    });
    return init;
  });

  const colorElementsRef = useRef<Record<string, Element[]>>({});
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [textFonts, setTextFonts] = useState<Record<string, string>>({});
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedTeamStoreId, setSelectedTeamStoreId] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdatingPreview, setIsUpdatingPreview] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: teamStores } = useQuery({
    queryKey: ["art-library-team-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, organization")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const fonts = new Set<string>([
      ...(template.supported_fonts ?? []),
      template.school_font,
      template.mascot_font,
    ]);
    fonts.forEach((f) => { if (f) loadGoogleFont(f); });
  }, [template]);

  useEffect(() => {
    if (!svgContainerRef.current || !template.svg_url_master) return;
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
            if (!newColors[slot]) {
              newColors[slot] = defaultColors[slot] || "#000000";
            }
          });
          setColors(newColors);
          colorElementsRef.current = elMap;
        }
      })
      .catch(() => toast.error("Failed to load SVG template"));
    return () => { cancelled = true; };
  }, [template.svg_url_master]);

  const updateSvg = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    textBlocks.forEach((block) => {
      const el = svg.querySelector(`#${block.id}`) as SVGTextElement | null;
      if (!el) return;
      const newText = textValues[block.id] ?? block.defaultText;
      const font = textFonts[block.id] ?? block.font;

      if (!el.getAttribute("text-anchor")) {
        el.setAttribute("text-anchor", "middle");
      }

      const tspans = el.querySelectorAll("tspan");
      if (tspans.length > 0) {
        tspans[0].textContent = newText;
        for (let i = 1; i < tspans.length; i++) {
          tspans[i].textContent = "";
        }
        tspans.forEach((tspan) => {
          tspan.setAttribute("font-family", font);
          (tspan as SVGElement).style.fontFamily = font;
          if (!tspan.getAttribute("text-anchor")) {
            tspan.setAttribute("text-anchor", "middle");
          }
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
      if (els) {
        els.forEach((el) => {
          (el as SVGElement).style.fill = color;
        });
      }
    });
  }, [textBlocks, textValues, textFonts, colors, colorSlots]);

  useEffect(() => {
    updateSvg();
  }, [updateSvg]);

  const setTextValue = (id: string, value: string) => {
    setTextValues((prev) => ({ ...prev, [id]: value }));
  };

  const setTextFont = (id: string, font: string) => {
    loadGoogleFont(font);
    setTextFonts((prev) => ({ ...prev, [id]: font }));
  };

  const setColor = (slot: string, value: string) => {
    setColors((prev) => ({ ...prev, [slot]: value }));
  };

  const handleDragText = useCallback(() => {}, []);

  /** Center selected text horizontally in SVG viewBox */
  const handleCenterH = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const vb = svg.viewBox?.baseVal;
    const centerX = vb && vb.width > 0 ? vb.x + vb.width / 2 : (svg.width.baseVal.value || 500) / 2;
    el.setAttribute("x", String(centerX));
    el.setAttribute("text-anchor", "middle");
    el.querySelectorAll("tspan").forEach((tspan) => {
      if (tspan.hasAttribute("x")) {
        tspan.setAttribute("x", String(centerX));
        tspan.setAttribute("text-anchor", "middle");
      }
    });
  }, [selectedTextId]);

  /** Center selected text vertically in SVG viewBox */
  const handleCenterV = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const vb = svg.viewBox?.baseVal;
    const centerY = vb && vb.height > 0 ? vb.y + vb.height / 2 : (svg.height.baseVal.value || 500) / 2;
    const bbox = el.getBBox();
    const newY = centerY + bbox.height / 3; // baseline adjustment
    el.setAttribute("y", String(newY));
  }, [selectedTextId]);

  /** Scale selected text up */
  const handleScaleUp = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const currentSize = parseFloat(el.getAttribute("font-size") || window.getComputedStyle(el).fontSize || "48");
    const newSize = Math.min(400, Math.round(currentSize * 1.15));
    el.setAttribute("font-size", String(newSize));
    el.style.fontSize = `${newSize}px`;
    el.querySelectorAll("tspan").forEach((t) => {
      t.setAttribute("font-size", String(newSize));
      (t as SVGElement).style.fontSize = `${newSize}px`;
    });
  }, [selectedTextId]);

  /** Scale selected text down */
  const handleScaleDown = useCallback(() => {
    if (!selectedTextId || !svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;
    const el = svg.querySelector(`#${selectedTextId}`) as SVGTextElement | null;
    if (!el) return;
    const currentSize = parseFloat(el.getAttribute("font-size") || window.getComputedStyle(el).fontSize || "48");
    const newSize = Math.max(8, Math.round(currentSize * 0.85));
    el.setAttribute("font-size", String(newSize));
    el.style.fontSize = `${newSize}px`;
    el.querySelectorAll("tspan").forEach((t) => {
      t.setAttribute("font-size", String(newSize));
      (t as SVGElement).style.fontSize = `${newSize}px`;
    });
  }, [selectedTextId]);

  const getSerializedSvg = (): string => {
    if (!svgContainerRef.current) return "";
    const svgEl = svgContainerRef.current.querySelector("svg");
    if (!svgEl) return "";
    return new XMLSerializer().serializeToString(svgEl);
  };

  /** Build a design name from template + text values */
  const getDesignName = () => {
    const schoolName = textValues["school-name"] || textValues["text-block-0"] || "";
    const mascotName = textValues["mascot-name"] || textValues["text-block-1"] || "";
    const parts = [schoolName, mascotName].filter(Boolean);
    return parts.length > 0 ? `${template.code} — ${parts.join(" ")}` : template.name;
  };

  /** Collect all fonts currently in use */
  const getUsedFonts = (): Set<string> => {
    const fonts = new Set<string>();
    textBlocks.forEach((b) => {
      const font = textFonts[b.id] ?? b.font;
      if (font) fonts.add(font);
    });
    return fonts;
  };

  /** Build font info text for the package */
  const getFontInfo = (): string => {
    const usedFonts = getUsedFonts();
    const lines = [
      `Design: ${getDesignName()}`,
      `Template: ${template.code}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "FONTS USED",
      "===========",
      ...Array.from(usedFonts).map((f) => `• ${f} — https://fonts.google.com/specimen/${f.replace(/ /g, "+")}`),
      "",
      "COLORS USED",
      "===========",
      ...colorSlots.map((slot) => `• ${slot}: ${colors[slot] || "N/A"}`),
      "",
      "TEXT LAYERS",
      "===========",
      ...textBlocks.map((b) => `• ${b.label}: "${textValues[b.id] ?? b.defaultText}" (font: ${textFonts[b.id] ?? b.font})`),
      "",
      "NOTES",
      "=====",
      "• SVG file is the source of truth — fully editable in Adobe Illustrator, Inkscape, or Figma.",
      "• PNG is a high-resolution (2048×2048) rasterized version.",
      "• To create AI/EPS files, open the SVG in Adobe Illustrator and export.",
      "• Fonts must be installed locally or outlined before sending to print.",
    ];
    return lines.join("\n");
  };

  // Save to team logos
  const saveMutation = useMutation({
    mutationFn: async () => {
      const svgString = getSerializedSvg();
      if (!svgString) throw new Error("No SVG to save");

      const timestamp = Date.now();
      const folder = selectedTeamStoreId || "global";
      const baseName = `${folder}/${template.code}-${timestamp}`;

      // Upload SVG
      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const svgPath = `${baseName}.svg`;
      const { error: svgErr } = await supabase.storage
        .from("store-logos")
        .upload(svgPath, svgBlob, { upsert: true, contentType: "image/svg+xml" });
      if (svgErr) throw svgErr;

      // Upload PNG
      let pngUrl = "";
      try {
        const svgEl = svgContainerRef.current?.querySelector("svg");
        const pngBlob = svgEl
          ? await svgToPngWithFonts(svgEl, getUsedFonts())
          : await svgToPng(svgString);
        const pngPath = `${baseName}.png`;
        const { error: pngErr } = await supabase.storage
          .from("store-logos")
          .upload(pngPath, pngBlob, { upsert: true, contentType: "image/png" });
        if (!pngErr) {
          pngUrl = `${SUPABASE_URL}/storage/v1/object/public/store-logos/${pngPath}`;
        }
      } catch {
        // PNG is best-effort
      }

      const svgUrl = `${SUPABASE_URL}/storage/v1/object/public/store-logos/${svgPath}`;
      const designName = getDesignName();

      // Insert into store_logos
      const { data: newLogo, error: logoErr } = await supabase
        .from("store_logos")
        .insert({
          team_store_id: selectedTeamStoreId || null,
          name: designName,
          method: "multi",
          placement: "left_front",
          decoration_type: "screen_print",
          file_url: pngUrl || svgUrl,
          file_type: "svg",
          original_file_url: svgUrl,
        } as any)
        .select("id")
        .single();
      if (logoErr) throw logoErr;

      // Create default variant
      await supabase.from("store_logo_variants" as any).insert({
        store_logo_id: newLogo.id,
        name: "Default",
        colorway: "original",
        file_url: pngUrl || svgUrl,
        screen_print_enabled: true,
        embroidery_enabled: false,
        dtf_enabled: false,
        background_rule: "any",
        is_default: true,
        file_type: pngUrl ? "image" : "svg",
        original_file_url: svgUrl,
      });

      // Also save to team_art for metadata (only if a store is selected)
      if (selectedTeamStoreId) {
        await supabase
          .from("team_art" as any)
          .upsert({
            team_store_id: selectedTeamStoreId,
            design_template_id: template.id,
            svg_url_final: svgUrl,
            school_name: textValues["school-name"] || "",
            mascot_name: textValues["mascot-name"] || "",
            primary_color: colors.primary || "",
            secondary_color: colors.secondary || "",
            text_fonts: textFonts,
            color_values: colors,
          }, { onConflict: "team_store_id,design_template_id" } as any);
      }

      return svgUrl;
    },
    onSuccess: () => {
      toast.success("Design saved to team logos!", {
        description: "SVG + PNG uploaded and added to logo library",
      });
      queryClient.invalidateQueries({ queryKey: ["art-library"] });
      queryClient.invalidateQueries({ queryKey: ["store-logos"] });
    },
    onError: (err: any) => {
      toast.error("Failed to save design", { description: err.message });
    },
  });

  // Update customer-facing preview image
  const handleUpdatePreview = async () => {
    setIsUpdatingPreview(true);
    try {
      const svgEl = svgContainerRef.current?.querySelector("svg");
      if (!svgEl) throw new Error("No SVG to render");
      const pngBlob = await svgToPngWithFonts(svgEl, getUsedFonts(), 1024, 1024);
      const path = `previews/${template.code}-preview.png`;
      const { error: upErr } = await supabase.storage
        .from("team-art")
        .upload(path, pngBlob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("team-art").getPublicUrl(path);
      const previewUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("design_templates")
        .update({ thumbnail_url: previewUrl, image_url: previewUrl })
        .eq("id", template.id);
      if (dbErr) throw dbErr;
      toast.success("Preview image updated!");
      queryClient.invalidateQueries({ queryKey: ["art-library-templates"] });
    } catch (err: any) {
      toast.error("Failed to update preview", { description: err.message });
    } finally {
      setIsUpdatingPreview(false);
    }
  };

  // Download logo package as ZIP
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const svgString = getSerializedSvg();
      if (!svgString) throw new Error("No SVG to export");

      const zip = new JSZip();
      const folderName = `${template.code}-logo-package`;
      const folder = zip.folder(folderName)!;

      // SVG
      folder.file(`${template.code}.svg`, svgString);

      // PNG (high-res)
      try {
        const svgEl2 = svgContainerRef.current?.querySelector("svg");
        const pngBlob = svgEl2
          ? await svgToPngWithFonts(svgEl2, getUsedFonts(), 2048, 2048)
          : await svgToPng(svgString, 2048, 2048);
        folder.file(`${template.code}-2048.png`, pngBlob);
      } catch {
        // skip if PNG fails
      }

      // PNG (web-res)
      try {
        const svgEl3 = svgContainerRef.current?.querySelector("svg");
        const pngSmall = svgEl3
          ? await svgToPngWithFonts(svgEl3, getUsedFonts(), 512, 512)
          : await svgToPng(svgString, 512, 512);
        folder.file(`${template.code}-512.png`, pngSmall);
      } catch {
        // skip
      }

      // Font & color info
      folder.file("README.txt", getFontInfo());

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Logo package downloaded!", {
        description: "Includes SVG, PNG (hi-res & web), fonts and color info",
      });
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{template.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{template.code}</p>
        </div>
      </div>

      {/* Builder layout: canvas + panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 min-h-0">
        {/* Canvas */}
        <div className="min-h-0 border border-border rounded-xl overflow-hidden">
          <BuilderCanvas
            svgContainerRef={svgContainerRef as React.RefObject<HTMLDivElement>}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onDragText={handleDragText}
            textBlocks={textBlocks}
          />
        </div>

        {/* Side panel */}
        <div className="min-h-0 overflow-hidden">
          <BuilderPanel
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
            teamStores={teamStores}
            selectedTeamStoreId={selectedTeamStoreId}
            onTeamStoreChange={setSelectedTeamStoreId}
            onSave={() => saveMutation.mutate()}
            isSaving={saveMutation.isPending}
            onDownload={handleDownload}
            isDownloading={isDownloading}
            onUpdatePreview={handleUpdatePreview}
            isUpdatingPreview={isUpdatingPreview}
            onCenterH={handleCenterH}
            onCenterV={handleCenterV}
            onScaleUp={handleScaleUp}
            onScaleDown={handleScaleDown}
          />
        </div>
      </div>
    </div>
  );
}
