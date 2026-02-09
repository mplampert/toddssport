import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Copy, X, FileText, Ruler } from "lucide-react";
import { toast } from "sonner";
import type { StoreProduct } from "./ProductListPane";

interface Props {
  item: StoreProduct;
  storeId: string;
  ssDescription?: string | null;
}

export function ProductDescriptionTab({ item, storeId, ssDescription }: Props) {
  const queryClient = useQueryClient();
  const catalogDescription = item.catalog_styles?.description || ssDescription || "";

  const [descOverride, setDescOverride] = useState((item as any).description_override ?? "");
  const [shortDescOverride, setShortDescOverride] = useState((item as any).short_description_override ?? "");
  const [sizeChartOverrideId, setSizeChartOverrideId] = useState<string | null>((item as any).size_chart_override_id ?? null);
  const [displayMode, setDisplayMode] = useState<string>((item as any).size_chart_display_mode ?? "popup");
  const [dirty, setDirty] = useState(false);

  // Fetch available size charts
  const { data: sizeCharts = [] } = useQuery({
    queryKey: ["size-charts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("size_charts")
        .select("id, name, brand, category, content_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_products")
        .update({
          description_override: descOverride.trim() || null,
          short_description_override: shortDescOverride.trim() || null,
          size_chart_override_id: sizeChartOverrideId,
          size_chart_display_mode: displayMode,
        } as any)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["team-store-product-editor", item.id] });
      toast.success("Description & size chart saved");
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = () => setDirty(true);

  const copyVendorDesc = () => {
    setDescOverride(catalogDescription);
    setDirty(true);
  };

  const clearOverride = () => {
    setDescOverride("");
    setDirty(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Description Section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Product Description</h3>
        </div>

        {/* Vendor description (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vendor Description (read-only, from API)</Label>
          {catalogDescription ? (
            <div
              className="p-3 bg-muted/30 rounded-lg border text-sm prose prose-sm max-w-none max-h-40 overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: catalogDescription }}
            />
          ) : (
            <p className="text-xs text-muted-foreground italic p-3 bg-muted/30 rounded-lg border">
              No vendor description available.
            </p>
          )}
        </div>

        {/* Store description override */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Store Description Override</Label>
            <div className="flex gap-1.5">
              {catalogDescription && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copyVendorDesc}>
                  <Copy className="w-3 h-3 mr-1" /> Copy vendor
                </Button>
              )}
              {descOverride && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={clearOverride}>
                  <X className="w-3 h-3 mr-1" /> Clear override
                </Button>
              )}
            </div>
          </div>
          <Textarea
            value={descOverride}
            onChange={(e) => { setDescOverride(e.target.value); m(); }}
            placeholder="Leave blank to use vendor description. Supports HTML."
            rows={5}
          />
          <p className="text-[10px] text-muted-foreground">
            {descOverride.trim()
              ? "✓ Using store override — vendor description will not show."
              : "Using vendor description (no override set)."}
          </p>
        </div>

        {/* Short description */}
        <div className="space-y-1.5">
          <Label>Short Description (optional)</Label>
          <Textarea
            value={shortDescOverride}
            onChange={(e) => { setShortDescOverride(e.target.value); m(); }}
            placeholder="Brief summary for product cards (optional)"
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* ── Size Chart Section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Size Chart</h3>
        </div>

        <div className="space-y-1.5">
          <Label>Size Chart Override</Label>
          <Select
            value={sizeChartOverrideId ?? "none"}
            onValueChange={(v) => { setSizeChartOverrideId(v === "none" ? null : v); m(); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Use vendor default…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No size chart / Use vendor default</SelectItem>
              {sizeCharts.map((sc) => (
                <SelectItem key={sc.id} value={sc.id}>
                  {sc.name}{sc.brand ? ` (${sc.brand})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            {sizeChartOverrideId
              ? "✓ Using overridden size chart."
              : "No override — will use vendor chart if available."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Display Mode</Label>
          <Select value={displayMode} onValueChange={(v) => { setDisplayMode(v); m(); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popup">Popup (dialog)</SelectItem>
              <SelectItem value="tab">Tab (inline tab)</SelectItem>
              <SelectItem value="inline">Inline (below size selector)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sizeCharts.length === 0 && (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg border p-3">
            No size charts created yet. You can manage size charts in the admin settings.
          </p>
        )}
      </div>

      {dirty && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" /> Save Description & Size Chart
        </Button>
      )}
    </div>
  );
}
