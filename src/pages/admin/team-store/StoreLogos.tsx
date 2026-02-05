import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Upload, Store } from "lucide-react";
import { toast } from "sonner";

export default function StoreLogos() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState(store.logo_url ?? "");

  useEffect(() => {
    setLogoUrl(store.logo_url ?? "");
  }, [store.logo_url]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({ logo_url: logoUrl || null })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Logo updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Logos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Primary Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center mx-auto border">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <Store className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-cta">
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Saving…" : "Save Logo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secondary Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center mx-auto border mb-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Secondary logo support coming soon. Use this for alternate versions (white, monochrome, etc.)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
