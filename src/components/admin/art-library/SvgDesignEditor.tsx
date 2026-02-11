import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadGoogleFont } from "./GoogleFontPicker";
import { discoverTextBlocks, discoverColors, type TextBlock } from "./svg-editor/utils";
import { BuilderCanvas } from "./svg-editor/BuilderCanvas";
import { BuilderPanel } from "./svg-editor/BuilderPanel";

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
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch team stores
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

  // Load all supported fonts + template defaults
  useEffect(() => {
    const fonts = new Set<string>([
      ...(template.supported_fonts ?? []),
      template.school_font,
      template.mascot_font,
    ]);
    fonts.forEach((f) => { if (f) loadGoogleFont(f); });
  }, [template]);

  // Fetch and render SVG, then discover text blocks + colors
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
        svgEl.style.maxWidth = "100%";
        svgEl.style.maxHeight = "100%";

        // Discover text blocks from SVG DOM
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

        // Auto-discover colors
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

  // Apply text + color changes to SVG DOM
  const updateSvg = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    // Update text blocks
    textBlocks.forEach((block) => {
      const el = svg.querySelector(`#${block.id}`) as SVGTextElement | null;
      if (!el) return;
      const newText = textValues[block.id] ?? block.defaultText;
      const font = textFonts[block.id] ?? block.font;

      // Ensure text stays centered
      if (!el.getAttribute("text-anchor")) {
        el.setAttribute("text-anchor", "middle");
      }

      // Update text content: preserve tspan structure if present
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

    // Update color slots
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

  const handleDragText = useCallback((id: string, dx: number, dy: number) => {
    // Drag handled directly in canvas for responsiveness
  }, []);

  // Serialize SVG
  const getSerializedSvg = (): string => {
    if (!svgContainerRef.current) return "";
    const svgEl = svgContainerRef.current.querySelector("svg");
    if (!svgEl) return "";
    return new XMLSerializer().serializeToString(svgEl);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeamStoreId) throw new Error("Please select a team store");
      const svgString = getSerializedSvg();
      if (!svgString) throw new Error("No SVG to save");

      const fileName = `team_${selectedTeamStoreId}_${template.id}.svg`;
      const blob = new Blob([svgString], { type: "image/svg+xml" });

      const { error: uploadError } = await supabase.storage
        .from("team-art")
        .upload(fileName, blob, { upsert: true, contentType: "image/svg+xml" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-art")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("team_art" as any)
        .upsert({
          team_store_id: selectedTeamStoreId,
          design_template_id: template.id,
          svg_url_final: urlData.publicUrl,
          school_name: textValues["school-name"] || "",
          mascot_name: textValues["mascot-name"] || "",
          primary_color: colors.primary || "",
          secondary_color: colors.secondary || "",
          text_fonts: textFonts,
          color_values: colors,
        }, { onConflict: "team_store_id,design_template_id" } as any);
      if (dbError) throw dbError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      toast.success("Design saved!", { description: "SVG uploaded to storage" });
      queryClient.invalidateQueries({ queryKey: ["art-library"] });
    },
    onError: (err: any) => {
      toast.error("Failed to save design", { description: err.message });
    },
  });

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
          />
        </div>
      </div>
    </div>
  );
}
