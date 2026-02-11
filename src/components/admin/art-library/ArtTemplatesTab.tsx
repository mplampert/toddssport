import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DESIGN_IMAGE_FALLBACKS } from "@/lib/designImageFallbacks";
import { SvgDesignEditor } from "./SvgDesignEditor";
import { NewTemplateDialog } from "./NewTemplateDialog";

interface DesignTemplate {
  id: string;
  code: string;
  name: string;
  sport: string;
  category: string;
  image_url: string | null;
  thumbnail_url: string | null;
  svg_url_master: string | null;
  school_font: string;
  mascot_font: string;
  supported_fonts: string[];
  color_slots: string[];
  default_colors: Record<string, string> | null;
  active: boolean;
}

export function ArtTemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("design_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["art-library-templates"] });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const handleUploadSvg = async (file: File, template: DesignTemplate) => {
    if (!file.name.endsWith(".svg")) {
      toast.error("Please upload an SVG file");
      return;
    }
    setUploadingId(template.id);
    try {
      const path = `masters/${template.code}.svg`;
      const { error: upErr } = await supabase.storage
        .from("team-art")
        .upload(path, file, { upsert: true, contentType: "image/svg+xml" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("team-art").getPublicUrl(path);

      const { error: dbErr } = await supabase
        .from("design_templates")
        .update({ svg_url_master: urlData.publicUrl })
        .eq("id", template.id);
      if (dbErr) throw dbErr;

      toast.success("SVG master uploaded!");
      queryClient.invalidateQueries({ queryKey: ["art-library-templates"] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };
  const { data: templates, isLoading } = useQuery({
    queryKey: ["art-library-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_templates")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DesignTemplate[];
    },
  });

  if (selectedTemplate) {
    return (
      <SvgDesignEditor
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex justify-end">
          <NewTemplateDialog />
        </div>
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p>No templates found. Click "New Template" above to add one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <NewTemplateDialog />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {templates.map((t) => {
        const thumb = t.thumbnail_url || t.image_url || DESIGN_IMAGE_FALLBACKS[t.code];
        return (
          <Card
            key={t.id}
            className="cursor-pointer hover:ring-2 hover:ring-accent transition-all group relative"
            onClick={() => setSelectedTemplate(t)}
          >
            <CardContent className="p-3">
              {/* Delete button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the template. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(t.id);
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {thumb ? (
                <img
                  src={thumb}
                  alt={t.name}
                  className="w-full aspect-square object-contain rounded bg-muted p-1"
                />
              ) : (
                <div className="w-full aspect-square bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  No preview
                </div>
              )}
              <div className="mt-2">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{t.code}</Badge>
                  <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                </div>
                {!t.svg_url_master && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    disabled={uploadingId === t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".svg";
                      input.onchange = (ev) => {
                        const f = (ev.target as HTMLInputElement).files?.[0];
                        if (f) handleUploadSvg(f, t);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploadingId === t.id ? "Uploading…" : "Upload SVG"}
                  </Button>
                )}
                {t.svg_url_master && (
                  <Badge variant="default" className="text-[10px] mt-2">SVG Ready</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}