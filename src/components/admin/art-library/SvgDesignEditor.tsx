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
import { loadGoogleFont } from "./GoogleFontPicker";
// SVG is fetched from svg_url_master at runtime

interface SvgDesignEditorProps {
  template: {
    id: string;
    code: string;
    name: string;
    svg_url_master: string | null;
    school_font: string;
    mascot_font: string;
    default_colors: { primary?: string; secondary?: string } | null;
  };
  onBack: () => void;
}

export function SvgDesignEditor({ template, onBack }: SvgDesignEditorProps) {
  const defaultPrimary = template.default_colors?.primary ?? "#C8102E";
  const defaultSecondary = template.default_colors?.secondary ?? "#000000";

  const [schoolName, setSchoolName] = useState("WOLVES");
  const [mascotName, setMascotName] = useState("Mascot");
  const [primaryColor, setPrimaryColor] = useState(defaultPrimary);
  const [secondaryColor, setSecondaryColor] = useState(defaultSecondary);
  const [selectedTeamStoreId, setSelectedTeamStoreId] = useState<string>("");
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch team stores for the dropdown
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

  // Load Google Fonts for this template
  useEffect(() => {
    if (template.school_font) loadGoogleFont(template.school_font);
    if (template.mascot_font) loadGoogleFont(template.mascot_font);
  }, [template.school_font, template.mascot_font]);

  // Fetch and render SVG inline from svg_url_master
  useEffect(() => {
    if (!svgContainerRef.current || !template.svg_url_master) return;
    let cancelled = false;
    fetch(template.svg_url_master)
      .then((r) => r.text())
      .then((svgText) => {
        if (cancelled || !svgContainerRef.current) return;
        svgContainerRef.current.innerHTML = svgText;
        const svgEl = svgContainerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.maxWidth = "500px";
          svgEl.style.maxHeight = "500px";
        }
        updateSvg();
      })
      .catch(() => toast.error("Failed to load SVG template"));
    return () => { cancelled = true; };
  }, [template.svg_url_master]);

  const updateSvg = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svg = svgContainerRef.current.querySelector("svg");
    if (!svg) return;

    // Update school name text
    let schoolTextEl = svg.querySelector("#school-name") as SVGTextElement | null;
    if (!schoolTextEl) {
      // Create the text element if it doesn't exist
      schoolTextEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      schoolTextEl.id = "school-name";
      schoolTextEl.setAttribute("x", "600");
      schoolTextEl.setAttribute("y", "560");
      schoolTextEl.setAttribute("text-anchor", "middle");
      schoolTextEl.setAttribute("font-family", template.school_font || "Alumni Sans Collegiate One");
      schoolTextEl.setAttribute("font-size", "100");
      schoolTextEl.setAttribute("fill", "#FFFFFF");
      schoolTextEl.setAttribute("stroke", secondaryColor);
      schoolTextEl.setAttribute("stroke-width", "2");
      svg.appendChild(schoolTextEl);
    }
    schoolTextEl.textContent = schoolName;

    // Update mascot name text
    let mascotTextEl = svg.querySelector("#mascot-name") as SVGTextElement | null;
    if (!mascotTextEl) {
      mascotTextEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      mascotTextEl.id = "mascot-name";
      mascotTextEl.setAttribute("x", "600");
      mascotTextEl.setAttribute("y", "1070");
      mascotTextEl.setAttribute("text-anchor", "middle");
      mascotTextEl.setAttribute("font-family", template.mascot_font || "Playball");
      mascotTextEl.setAttribute("font-size", "60");
      mascotTextEl.setAttribute("fill", "#FFFFFF");
      svg.appendChild(mascotTextEl);
    }
    mascotTextEl.textContent = mascotName;

    // Update primary color (.primary-fill elements)
    svg.querySelectorAll(".primary-fill").forEach((el) => {
      (el as SVGElement).style.fill = primaryColor;
    });

    // Update secondary color (.secondary-fill elements)
    svg.querySelectorAll(".secondary-fill").forEach((el) => {
      (el as SVGElement).style.fill = secondaryColor;
    });

    // Update text stroke to match secondary
    if (schoolTextEl) {
      schoolTextEl.setAttribute("stroke", secondaryColor);
    }
  }, [schoolName, mascotName, primaryColor, secondaryColor]);

  useEffect(() => {
    updateSvg();
  }, [updateSvg]);

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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("team-art")
        .upload(fileName, blob, { upsert: true, contentType: "image/svg+xml" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-art")
        .getPublicUrl(fileName);

      // Upsert team_art record
      const { error: dbError } = await supabase
        .from("team_art" as any)
        .upsert({
          team_store_id: selectedTeamStoreId,
          design_template_id: template.id,
          svg_url_final: urlData.publicUrl,
          school_name: schoolName,
          mascot_name: mascotName,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        }, { onConflict: "team_store_id,design_template_id" } as any);
      if (dbError) throw dbError;

      return urlData.publicUrl;
    },
    onSuccess: (url) => {
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
                <p className="text-sm text-muted-foreground">No SVG master uploaded for this template. Set <code>svg_url_master</code> in the database.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customize Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="school-name-input">
                  School Name
                  <span className="text-xs text-muted-foreground ml-1 font-normal">(Alumni Sans Collegiate One)</span>
                </Label>
                <Input
                  id="school-name-input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value.toUpperCase())}
                  placeholder="e.g. WOLVES"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mascot-name-input">
                  Mascot / Accent Text
                  <span className="text-xs text-muted-foreground ml-1 font-normal">(Playball)</span>
                </Label>
                <Input
                  id="mascot-name-input"
                  value={mascotName}
                  onChange={(e) => setMascotName(e.target.value)}
                  placeholder="e.g. Spirit Wear"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customize Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="primary-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="secondary-color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
