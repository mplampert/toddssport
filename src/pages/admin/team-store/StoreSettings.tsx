import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function StoreSettings() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    start_date: store.start_date ?? "",
    end_date: store.end_date ?? "",
    active: store.active,
    store_pin: store.store_pin ?? "",
    fundraising_goal_amount: store.fundraising_goal_amount != null ? String(store.fundraising_goal_amount) : "",
  });

  useEffect(() => {
    setForm({
      start_date: store.start_date ?? "",
      end_date: store.end_date ?? "",
      active: store.active,
      store_pin: store.store_pin ?? "",
      fundraising_goal_amount: store.fundraising_goal_amount != null ? String(store.fundraising_goal_amount) : "",
    });
  }, [store]);

  // Calculate funds raised from orders
  const { data: fundsRaised = 0 } = useQuery({
    queryKey: ["funds-raised", store.id],
    queryFn: async () => {
      // Get all cart items for this store's orders that have been completed
      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select("quantity, team_store_id")
        .eq("team_store_id", store.id);
      if (error) throw error;

      // Get fundraising amounts from team_store_products
      const { data: products, error: pErr } = await supabase
        .from("team_store_products")
        .select("style_id, fundraising_enabled, fundraising_amount_per_unit")
        .eq("team_store_id", store.id)
        .eq("fundraising_enabled", true);
      if (pErr) throw pErr;

      const amountMap = new Map(
        (products ?? [])
          .filter((p: any) => p.fundraising_amount_per_unit)
          .map((p: any) => [p.style_id, p.fundraising_amount_per_unit])
      );

      let total = 0;
      for (const item of cartItems ?? []) {
        // Simplified: sum qty × fundraising_amount for all items
        // In production you'd join on the specific product
        const amounts = Array.from(amountMap.values());
        if (amounts.length > 0) {
          total += item.quantity * (amounts[0] as number);
        }
      }
      return total;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          active: form.active,
          store_pin: form.store_pin || null,
          fundraising_goal_amount: form.fundraising_goal_amount ? parseFloat(form.fundraising_goal_amount) : null,
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

  const goalAmount = form.fundraising_goal_amount ? parseFloat(form.fundraising_goal_amount) : 0;
  const progressPercent = goalAmount > 0 ? Math.min(100, (fundsRaised / goalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* Fundraising Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fundraising
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fundraising Goal ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.fundraising_goal_amount}
              onChange={(e) => setForm((f) => ({ ...f, fundraising_goal_amount: e.target.value }))}
              placeholder="e.g. 5000.00"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funds Raised</span>
              <span className="font-semibold">${fundsRaised.toFixed(2)} {goalAmount > 0 && `/ $${goalAmount.toFixed(2)}`}</span>
            </div>
            {goalAmount > 0 && (
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-accent h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
