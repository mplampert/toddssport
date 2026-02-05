import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { TeamStoreBrandingPreview } from "@/components/admin/team-stores/TeamStoreBrandingPreview";

export default function StoreBranding() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    primary_color: store.primary_color ?? "#000000",
    secondary_color: store.secondary_color ?? "#ffffff",
  });

  useEffect(() => {
    setForm({
      name: store.name,
      slug: store.slug,
      primary_color: store.primary_color ?? "#000000",
      secondary_color: store.secondary_color ?? "#ffffff",
    });
  }, [store]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          name: form.name,
          slug: form.slug,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Branding updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Branding</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Store Identity</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name || !form.slug) {
                    toast.error("Name and slug are required");
                    return;
                  }
                  mutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Store Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({ ...f, name, slug: generateSlug(name) }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    />
                  </div>
                </div>

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

                <Button type="submit" className="btn-cta" disabled={mutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {mutation.isPending ? "Saving…" : "Save Branding"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div>
          <TeamStoreBrandingPreview
            name={form.name}
            logo_url={store.logo_url}
            primary_color={form.primary_color}
            secondary_color={form.secondary_color}
            start_date={store.start_date}
            end_date={store.end_date}
          />
        </div>
      </div>
    </div>
  );
}
