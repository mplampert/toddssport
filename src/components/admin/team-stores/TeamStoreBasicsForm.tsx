import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface TeamStore {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  active: boolean;
  store_pin: string | null;
}

interface Props {
  store: TeamStore;
}

export function TeamStoreBasicsForm({ store }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    start_date: store.start_date ?? "",
    end_date: store.end_date ?? "",
    logo_url: store.logo_url ?? "",
    primary_color: store.primary_color ?? "#000000",
    secondary_color: store.secondary_color ?? "#ffffff",
    active: store.active,
    store_pin: store.store_pin ?? "",
  });

  useEffect(() => {
    setForm({
      name: store.name,
      slug: store.slug,
      start_date: store.start_date ?? "",
      end_date: store.end_date ?? "",
      logo_url: store.logo_url ?? "",
      primary_color: store.primary_color ?? "#000000",
      secondary_color: store.secondary_color ?? "#ffffff",
      active: store.active,
      store_pin: store.store_pin ?? "",
    });
  }, [store]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          name: form.name,
          slug: form.slug,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          active: form.active,
          store_pin: form.store_pin || null,
        })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Store updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Basics</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: generateSlug(name) }));
                }}
                placeholder="Lincoln High Baseball"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="lincoln-high-baseball"
              />
            </div>
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

          {/* Logo URL moved to Branding tab */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Store PIN (optional — leave blank for open access)</Label>
            <Input
              value={form.store_pin}
              onChange={(e) => setForm((f) => ({ ...f, store_pin: e.target.value }))}
              placeholder="Leave blank for open access"
              maxLength={10}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            <Label>Active</Label>
          </div>

          <Button type="submit" className="btn-cta" disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
