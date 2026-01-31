import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Globe, Save } from "lucide-react";

interface GlobalSetting {
  id: string;
  markup_percent: number;
  rush_percent: number;
}

interface GlobalSettingsCardProps {
  onUpdate?: () => void;
}

export function GlobalSettingsCard({ onUpdate }: GlobalSettingsCardProps) {
  const [setting, setSetting] = useState<GlobalSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState("");
  const [rushPercent, setRushPercent] = useState("");

  useEffect(() => {
    fetchGlobalSetting();
  }, []);

  async function fetchGlobalSetting() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("champro_pricing_settings")
        .select("*")
        .eq("scope", "global")
        .single();

      if (error) throw error;

      setSetting({
        id: data.id,
        markup_percent: data.markup_percent,
        rush_percent: data.rush_percent,
      });
      setMarkupPercent(data.markup_percent.toString());
      setRushPercent(data.rush_percent.toString());
    } catch (err) {
      console.error("Error fetching global setting:", err);
      toast.error("Failed to load global settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!setting) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("champro_pricing_settings")
        .update({
          markup_percent: parseFloat(markupPercent) || 50,
          rush_percent: parseFloat(rushPercent) || 20,
        })
        .eq("id", setting.id);

      if (error) throw error;

      toast.success("Global settings saved");
      onUpdate?.();
    } catch (err) {
      console.error("Error saving global setting:", err);
      toast.error("Failed to save global settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-accent" />
          Global Pricing Settings
        </CardTitle>
        <CardDescription>
          Base markup applied to all products, plus rush fee for express orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="globalMarkup">Base Markup (%)</Label>
            <Input
              id="globalMarkup"
              type="number"
              step="0.1"
              className="w-28"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Applied to wholesale cost</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="globalRushPercent">Rush Fee (%)</Label>
            <Input
              id="globalRushPercent"
              type="number"
              step="0.1"
              className="w-28"
              value={rushPercent}
              onChange={(e) => setRushPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Extra % for 10-day & 5-day</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
