import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trophy, Plus, Trash2 } from "lucide-react";

interface SportSetting {
  id: string;
  sport: string;
  markup_percent: number;
  rush_markup_percent: number;
}

interface SportSettingsPanelProps {
  sports: string[];
  onUpdate?: () => void;
}

export function SportSettingsPanel({ sports, onUpdate }: SportSettingsPanelProps) {
  const [settings, setSettings] = useState<SportSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newSport, setNewSport] = useState("");
  const [newMarkup, setNewMarkup] = useState("50");
  const [newRushMarkup, setNewRushMarkup] = useState("50");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchSportSettings();
  }, []);

  async function fetchSportSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("champro_pricing_settings")
        .select("*")
        .eq("scope", "sport")
        .order("sport");

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error("Error fetching sport settings:", err);
      toast.error("Failed to load sport settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSport() {
    if (!newSport) {
      toast.error("Please select a sport");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("champro_pricing_settings")
        .insert({
          scope: "sport",
          sport: newSport,
          markup_percent: parseFloat(newMarkup) || 50,
          rush_markup_percent: parseFloat(newRushMarkup) || 50,
        });

      if (error) throw error;

      toast.success(`Added pricing for ${newSport}`);
      setNewSport("");
      setNewMarkup("50");
      setNewRushMarkup("50");
      fetchSportSettings();
      onUpdate?.();
    } catch (err) {
      console.error("Error adding sport setting:", err);
      toast.error("Failed to add sport setting");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateSport(setting: SportSetting, field: "markup_percent" | "rush_markup_percent", value: string) {
    setSaving(setting.id);
    try {
      const { error } = await supabase
        .from("champro_pricing_settings")
        .update({ [field]: parseFloat(value) || 50 })
        .eq("id", setting.id);

      if (error) throw error;

      setSettings((prev) =>
        prev.map((s) =>
          s.id === setting.id ? { ...s, [field]: parseFloat(value) || 50 } : s
        )
      );
      onUpdate?.();
    } catch (err) {
      console.error("Error updating sport setting:", err);
      toast.error("Failed to update sport setting");
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteSport(setting: SportSetting) {
    setSaving(setting.id);
    try {
      const { error } = await supabase
        .from("champro_pricing_settings")
        .delete()
        .eq("id", setting.id);

      if (error) throw error;

      toast.success(`Removed pricing for ${setting.sport}`);
      fetchSportSettings();
      onUpdate?.();
    } catch (err) {
      console.error("Error deleting sport setting:", err);
      toast.error("Failed to delete sport setting");
    } finally {
      setSaving(null);
    }
  }

  // Get sports that don't have a setting yet
  const availableSports = sports.filter(
    (sport) => !settings.some((s) => s.sport === sport)
  );

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
          <Trophy className="w-5 h-5 text-accent" />
          Sport-Level Markup
        </CardTitle>
        <CardDescription>
          Override global markup for specific sports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing sport settings */}
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
          >
            <span className="font-medium capitalize min-w-24">{setting.sport}</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Base:</Label>
              <Input
                type="number"
                step="0.1"
                className="w-20 h-8"
                value={setting.markup_percent}
                onChange={(e) =>
                  handleUpdateSport(setting, "markup_percent", e.target.value)
                }
                disabled={saving === setting.id}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Rush:</Label>
              <Input
                type="number"
                step="0.1"
                className="w-20 h-8"
                value={setting.rush_markup_percent}
                onChange={(e) =>
                  handleUpdateSport(setting, "rush_markup_percent", e.target.value)
                }
                disabled={saving === setting.id}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => handleDeleteSport(setting)}
              disabled={saving === setting.id}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Add new sport */}
        {availableSports.length > 0 && (
          <div className="flex items-end gap-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-xs">Sport</Label>
              <select
                className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newSport}
                onChange={(e) => setNewSport(e.target.value)}
              >
                <option value="">Select...</option>
                {availableSports.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Base %</Label>
              <Input
                type="number"
                step="0.1"
                className="w-20 h-9"
                value={newMarkup}
                onChange={(e) => setNewMarkup(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rush %</Label>
              <Input
                type="number"
                step="0.1"
                className="w-20 h-9"
                value={newRushMarkup}
                onChange={(e) => setNewRushMarkup(e.target.value)}
              />
            </div>
            <Button onClick={handleAddSport} disabled={adding || !newSport}>
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        )}

        {settings.length === 0 && availableSports.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sports available. Add products first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
