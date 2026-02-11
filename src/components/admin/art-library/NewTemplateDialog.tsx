import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload } from "lucide-react";

const SPORTS = [
  "volleyball",
  "baseball",
  "basketball",
  "football",
  "soccer",
  "softball",
  "lacrosse",
  "hockey",
  "track",
  "wrestling",
  "cheerleading",
  "swimming",
  "tennis",
  "golf",
  "general",
];

const CATEGORIES = ["classic", "modern", "retro", "bold", "script", "mascot"];

export function NewTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sport, setSport] = useState("volleyball");
  const [category, setCategory] = useState("classic");
  const [primaryColor, setPrimaryColor] = useState("#C8102E");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [active, setActive] = useState(true);
  const [schoolFont, setSchoolFont] = useState("Alumni Sans Collegiate One");
  const [mascotFont, setMascotFont] = useState("Playball");
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const resetForm = () => {
    setCode("");
    setName("");
    setSport("volleyball");
    setCategory("classic");
    setPrimaryColor("#C8102E");
    setSecondaryColor("#000000");
    setActive(true);
    setSchoolFont("Alumni Sans Collegiate One");
    setMascotFont("Playball");
    setSvgFile(null);
    setThumbFile(null);
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and Name are required");
      return;
    }

    setSaving(true);
    try {
      let svgUrl: string | null = null;
      let thumbUrl: string | null = null;

      // Upload SVG master
      if (svgFile) {
        const path = `masters/${code}.svg`;
        const { error } = await supabase.storage
          .from("team-art")
          .upload(path, svgFile, { upsert: true, contentType: "image/svg+xml" });
        if (error) throw error;
        const { data } = supabase.storage.from("team-art").getPublicUrl(path);
        svgUrl = data.publicUrl;
      }

      // Upload thumbnail
      if (thumbFile) {
        const ext = thumbFile.name.split(".").pop() || "png";
        const path = `thumbnails/${code}.${ext}`;
        const { error } = await supabase.storage
          .from("team-art")
          .upload(path, thumbFile, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("team-art").getPublicUrl(path);
        thumbUrl = data.publicUrl;
      }

      // Insert DB row
      const { error: dbErr } = await supabase.from("design_templates").insert({
        code: code.trim(),
        name: name.trim(),
        sport,
        category,
        active,
        school_font: schoolFont,
        mascot_font: mascotFont,
        svg_url_master: svgUrl,
        thumbnail_url: thumbUrl,
        default_colors: { primary: primaryColor, secondary: secondaryColor },
      });
      if (dbErr) throw dbErr;

      toast.success("Template created!");
      queryClient.invalidateQueries({ queryKey: ["art-library-templates"] });
      resetForm();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Design Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Code & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-code">Code *</Label>
              <Input
                id="tpl-code"
                placeholder="e.g. OB7XQ51-02"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name *</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Eagles Script"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Sport & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fonts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>School Name Font</Label>
              <Input
                placeholder="e.g. Alumni Sans Collegiate One"
                value={schoolFont}
                onChange={(e) => setSchoolFont(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mascot Name Font</Label>
              <Input
                placeholder="e.g. Playball"
                value={mascotFont}
                onChange={(e) => setMascotFont(e.target.value)}
              />
            </div>
          </div>

          {/* SVG Upload */}
          <div className="space-y-1.5">
            <Label>Master SVG</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".svg";
                  input.onchange = (ev) => {
                    const f = (ev.target as HTMLInputElement).files?.[0];
                    if (f) setSvgFile(f);
                  };
                  input.click();
                }}
              >
                <Upload className="h-3 w-3" />
                Choose SVG
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {svgFile ? svgFile.name : "No file selected"}
              </span>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-1.5">
            <Label>Thumbnail (optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (ev) => {
                    const f = (ev.target as HTMLInputElement).files?.[0];
                    if (f) setThumbFile(f);
                  };
                  input.click();
                }}
              >
                <Upload className="h-3 w-3" />
                Choose Image
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {thumbFile ? thumbFile.name : "No file selected"}
              </span>
            </div>
          </div>

          {/* Default Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Default Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} id="tpl-active" />
            <Label htmlFor="tpl-active">Active</Label>
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
