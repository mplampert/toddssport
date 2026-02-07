import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  itemId: string;
  assignedLogoIds: string[];
}

export function LogoAssignmentDialog({ open, onOpenChange, storeId, itemId, assignedLogoIds }: Props) {
  const queryClient = useQueryClient();
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedLogoIds));

  const { data: storeLogos = [] } = useQuery({
    queryKey: ["store-logos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_logos")
        .select("*")
        .eq("team_store_id", storeId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = methodFilter === "all"
    ? storeLogos
    : storeLogos.filter((l: any) => l.method === methodFilter);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing assignments for this item
      await supabase.from("team_store_item_logos").delete().eq("team_store_item_id", itemId);

      if (selected.size > 0) {
        const rows = Array.from(selected).map(logoId => ({
          team_store_item_id: itemId,
          store_logo_id: logoId,
        }));
        const { error } = await supabase.from("team_store_item_logos").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-logos", itemId] });
      toast.success("Logo assignments saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Logos</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Filter by Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="screen_print">Screen Print</SelectItem>
                <SelectItem value="embroidery">Embroidery</SelectItem>
                <SelectItem value="dtf">DTF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No logos found. Add logos in the Logos tab first.
            </p>
          ) : (
            <div className="space-y-1 border rounded-md max-h-64 overflow-y-auto">
              {filtered.map((logo: any) => (
                <label key={logo.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                  <Checkbox checked={selected.has(logo.id)} onCheckedChange={() => toggle(logo.id)} />
                  <img src={logo.file_url} alt="" className="w-8 h-8 object-contain rounded bg-muted" />
                  <div>
                    <p className="text-sm font-medium">{logo.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{logo.method.replace("_", " ")}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-cta w-full">
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save Assignments"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
