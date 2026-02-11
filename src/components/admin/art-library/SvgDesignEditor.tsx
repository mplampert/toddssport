import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadGoogleFont, GoogleFontPicker } from "./GoogleFontPicker";

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

interface TextBlock {
  id: string;
  label: string;
  font: string;
  defaultText: string;
}

interface SvgDesignEditorProps {
  template: TemplateData;
  onBack: () => void;
}

/** Introspect SVG DOM for <text> elements with IDs and extract font-family */
function discoverTextBlocks(svg: SVGSVGElement): TextBlock[] {
  const blocks: TextBlock[] = [];
  svg.querySelectorAll("text[id]").forEach((el) => {
    const id = el.getAttribute("id") || "";
    const font =
      el.getAttribute("font-family") ||
      (el as HTMLElement).style.fontFamily ||
      "sans-serif";
    const text = el.textContent || "";
    const label = id
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    blocks.push({ id, label, font: font.replace(/['"]/g, ""), defaultText: text });
  });
  return blocks;
}

const SLOT_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  accent: "Accent",
};

export function SvgDesignEditor({ template, onBack }: SvgDesignEditorProps) {
  const colorSlots = template.color_slots ?? ["primary", "secondary"];
  const defaultColors = template.default_colors ?? {};

  // Color state: keyed by slot name
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    colorSlots.forEach((slot) => {
      init[slot] = defaultColors[slot] || "#000000";
    });
    return init;
  });

  // Text block state: discovered from SVG DOM
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [textFonts, setTextFonts] = useState<Record<string, string>>({});

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

  // Fetch and render SVG, then discover text blocks
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
        svgEl.style.maxWidth = "500px";
        svgEl.style.maxHeight = "500px";

        // Discover text blocks from SVG DOM
        const blocks = discoverTextBlocks(svgEl);
        setTextBlocks(blocks);

        // Init text values & fonts from SVG
        const vals: Record<string, string> = {};
        const fnts: Record<string, string> = {};
        blocks.forEach((b) => {
          vals[b.id] = b.defaultText;
          fnts[b.id] = b.font;
          loadGoogleFont(b.font);
        });
        setTextValues(vals);
        setTextFonts(fnts);
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
      el.textContent = textValues[block.id] ?? block.defaultText;
      const font = textFonts[block.id] ?? block.font;
      el.setAttribute("font-family", font);
    });

    // Update color slots
    colorSlots.forEach((slot) => {
      const color = colors[slot];
      svg.querySelectorAll(`.${slot}-fill`).forEach((el) => {
        (el as SVGElement).style.fill = color;
      });
      // Also update stroke for text if matching
      svg.querySelectorAll(`.${slot}-stroke`).forEach((el) => {
        (el as SVGElement).style.stroke = color;
      });
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

      // Build metadata for the saved design
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
      toast.success("Design saved successfully!", {
        description: "SVG uploaded to storage",
      });
      queryClient.invalidateQueries({ queryKey: ["art-library"] });
    },
    onError: (err: any) => {
      toast.error("Failed to save design", { description: err.message });
    },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        Back to Templates
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SVG Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{template.code}</p>
          </CardHeader>
          <CardContent>
            <div
              ref={svgContainerRef}
              className="w-full flex items-center justify-center bg-muted/30 rounded-lg p-4 min-h-[300px]"
            >
              {!template.svg_url_master && (
                <p className="text-sm text-muted-foreground">
                  No SVG master uploaded for this template.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor Controls */}
        <div className="space-y-4">
          {/* Text Blocks — auto-discovered from SVG */}
          {textBlocks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customize Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {textBlocks.map((block) => (
                  <div key={block.id} className="space-y-2">
                    <Label>{block.label}</Label>
                    <Input
                      value={textValues[block.id] ?? ""}
                      onChange={(e) => setTextValue(block.id, e.target.value)}
                      placeholder={block.defaultText}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Font:</span>
                      <GoogleFontPicker
                        value={textFonts[block.id] ?? block.font}
                        onChange={(f) => setTextFont(block.id, f)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Color Slots — driven by template.color_slots */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customize Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {colorSlots.map((slot) => (
                  <div key={slot}>
                    <Label>{SLOT_LABELS[slot] || slot.charAt(0).toUpperCase() + slot.slice(1)} Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={colors[slot] || "#000000"}
                        onChange={(e) => setColor(slot, e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={colors[slot] || ""}
                        onChange={(e) => setColor(slot, e.target.value)}
                        className="w-28 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Save to Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Team Store</Label>
                <Select value={selectedTeamStoreId} onValueChange={setSelectedTeamStoreId}>
                  <SelectTrigger className="mt-1">
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
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !selectedTeamStoreId}
                className="w-full gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Design
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
