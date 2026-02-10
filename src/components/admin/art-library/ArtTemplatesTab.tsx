import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DESIGN_IMAGE_FALLBACKS } from "@/lib/designImageFallbacks";
import { SvgDesignEditor } from "./SvgDesignEditor";

interface DesignTemplate {
  id: string;
  code: string;
  name: string;
  sport: string;
  category: string;
  image_url: string | null;
  thumbnail_url: string | null;
  svg_url_master: string | null;
  default_colors: { primary?: string; secondary?: string } | null;
  active: boolean;
}

export function ArtTemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);

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
      <div className="border rounded-lg p-12 text-center text-muted-foreground mt-4">
        <p>No templates found. Insert a row into <code>design_templates</code> to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
      {templates.map((t) => {
        const thumb = t.thumbnail_url || t.image_url || DESIGN_IMAGE_FALLBACKS[t.code];
        return (
          <Card
            key={t.id}
            className="cursor-pointer hover:ring-2 hover:ring-accent transition-all group"
            onClick={() => setSelectedTemplate(t)}
          >
            <CardContent className="p-3">
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
