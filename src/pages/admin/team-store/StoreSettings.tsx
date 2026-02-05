import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function StoreSettings() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    start_date: store.start_date ?? "",
    end_date: store.end_date ?? "",
    active: store.active,
    store_pin: store.store_pin ?? "",
  });

  useEffect(() => {
    setForm({
      start_date: store.start_date ?? "",
      end_date: store.end_date ?? "",
      active: store.active,
      store_pin: store.store_pin ?? "",
    });
  }, [store]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          active: form.active,
          store_pin: form.store_pin || null,
        })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Store Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label>Store is Active</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Store PIN (optional)</Label>
              <Input
                value={form.store_pin}
                onChange={(e) => setForm((f) => ({ ...f, store_pin: e.target.value }))}
                placeholder="Leave blank for open access"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">If set, visitors must enter this PIN to access the store.</p>
            </div>

            <Button type="submit" className="btn-cta" disabled={mutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Deleting a store will remove all associated products and settings. This action cannot be undone.
          </p>
          <Button variant="destructive" disabled>
            Delete Store (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
