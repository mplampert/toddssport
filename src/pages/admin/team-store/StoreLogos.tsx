import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Store, Trash2, Plus, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/store-logos/${path}`;
}

export default function StoreLogos() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const decoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Decoration logo form state
  const [decoName, setDecoName] = useState("");
  const [decoMethod, setDecoMethod] = useState("screen_print");

  // Primary logo upload
  const uploadPrimaryLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/primary.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      const { error } = await supabase
        .from("team_stores")
        .update({ logo_url: publicUrl })
        .eq("id", store.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Primary logo uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  // Decoration logos (store_logos table)
  const { data: decoLogos = [] } = useQuery({
    queryKey: ["store-logos", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_logos")
        .select("*")
        .eq("team_store_id", store.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const uploadDecoLogo = async (file: File) => {
    if (!decoName.trim()) {
      toast.error("Please enter a logo name first");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/deco-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      const { error } = await supabase.from("store_logos").insert({
        team_store_id: store.id,
        name: decoName.trim(),
        method: decoMethod,
        file_url: publicUrl,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["store-logos", store.id] });
      setDecoName("");
      toast.success("Decoration logo added");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_logos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-logos", store.id] });
      toast.success("Logo removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Logos</h2>

      {/* Primary Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Store Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center mx-auto border">
            {store.logo_url ? (
              <img src={store.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
            ) : (
              <Store className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <input
            ref={primaryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPrimaryLogo(file);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => primaryInputRef.current?.click()}
            disabled={uploading}
            className="btn-cta w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : store.logo_url ? "Replace Logo" : "Upload Logo"}
          </Button>
        </CardContent>
      </Card>

      {/* Decoration Logos */}
      <Card>
        <CardHeader>
          <CardTitle>Decoration Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload logos used for screen printing, embroidery, or DTF. These can be assigned to individual products.
          </p>

          {/* Add new decoration logo */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Add New Logo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Logo Name</Label>
                <Input
                  value={decoName}
                  onChange={(e) => setDecoName(e.target.value)}
                  placeholder='e.g. "Front chest logo"'
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Decoration Method</Label>
                <Select value={decoMethod} onValueChange={setDecoMethod}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screen_print">Screen Print</SelectItem>
                    <SelectItem value="embroidery">Embroidery</SelectItem>
                    <SelectItem value="dtf">DTF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <input
              ref={decoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDecoLogo(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => decoInputRef.current?.click()}
              disabled={uploading || !decoName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              {uploading ? "Uploading…" : "Upload & Add Logo"}
            </Button>
          </div>

          {/* Existing decoration logos */}
          {decoLogos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No decoration logos yet.</p>
          ) : (
            <div className="space-y-2">
              {decoLogos.map((logo: any) => (
                <div key={logo.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                      <img src={logo.file_url} alt="" className="max-w-full max-h-full object-contain p-1" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{logo.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{logo.method.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(logo.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
