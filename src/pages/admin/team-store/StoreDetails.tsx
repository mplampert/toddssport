import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save, FileText, ImageIcon, Upload, Wand2, Loader2,
  Calendar, TrendingUp, RefreshCw, Info,
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "open", label: "Live" },
  { value: "closed", label: "Closed" },
];

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function parseCsv(val: string): string[] {
  return val ? val.split(",").filter(Boolean) : [];
}

function toLocalDatetime(val: string | null): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function toISOString(val: string): string | null {
  if (!val) return null;
  try {
    return new Date(val).toISOString();
  } catch {
    return null;
  }
}

export default function StoreDetails() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const heroInputRef = useRef<HTMLInputElement>(null);

  const { data: storeData, isLoading, error } = useQuery({
    queryKey: ["store-details", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("*")
        .eq("id", store.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    welcome_message: "",
    hero_title: "",
    hero_subtitle: "",
    hero_image_url: "",
    status: "draft",
    open_at: "",
    close_at: "",
    fundraising_percent: "",
    fundraising_goal: "",
    recurring_batch_enabled: false,
    recurring_batch_frequency: "weekly",
    recurring_batch_day_of_week: "",
    recurring_batch_day_of_month: "",
    recurring_batch_time: "",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (storeData) {
      setForm({
        name: storeData.name || "",
        description: (storeData as any).description || "",
        welcome_message: (storeData as any).welcome_message || "",
        hero_title: (storeData as any).hero_title || "",
        hero_subtitle: (storeData as any).hero_subtitle || "",
        hero_image_url: (storeData as any).hero_image_url || "",
        status: storeData.status || "draft",
        open_at: toLocalDatetime((storeData as any).open_at),
        close_at: toLocalDatetime((storeData as any).close_at),
        fundraising_percent: storeData.fundraising_percent != null ? String(storeData.fundraising_percent) : "",
        fundraising_goal: storeData.fundraising_goal != null ? String(storeData.fundraising_goal) : "",
        recurring_batch_enabled: (storeData as any).recurring_batch_enabled || false,
        recurring_batch_frequency: (storeData as any).recurring_batch_frequency || "weekly",
        recurring_batch_day_of_week: (storeData as any).recurring_batch_day_of_week != null ? String((storeData as any).recurring_batch_day_of_week) : "",
        recurring_batch_day_of_month: (storeData as any).recurring_batch_day_of_month != null ? String((storeData as any).recurring_batch_day_of_month) : "",
        recurring_batch_time: (storeData as any).recurring_batch_time || "",
      });
      setHasChanges(false);
    }
  }, [storeData]);

  const update = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setHasChanges(true);
  };

  // Save main details mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Store Name is required");

      const pct = form.fundraising_percent ? parseFloat(form.fundraising_percent) : null;
      if (pct !== null && (pct < 0 || pct > 100)) throw new Error("Fundraising percentage must be 0–100");

      const openAt = toISOString(form.open_at);
      const closeAt = toISOString(form.close_at);
      if (openAt && closeAt && new Date(closeAt) <= new Date(openAt)) {
        throw new Error("Close date must be after open date");
      }

      const { error } = await supabase
        .from("team_stores")
        .update({
          name: form.name.trim(),
          description: form.description || null,
          welcome_message: form.welcome_message || null,
          hero_title: form.hero_title || null,
          hero_subtitle: form.hero_subtitle || null,
          hero_image_url: form.hero_image_url || null,
          status: form.status,
          open_at: openAt,
          close_at: closeAt,
          fundraising_percent: pct,
          fundraising_goal: form.fundraising_goal ? parseFloat(form.fundraising_goal) : null,
        } as any)
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-details", store.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Store details saved");
      setHasChanges(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Save schedule mutation (separate)
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          recurring_batch_enabled: form.recurring_batch_enabled,
          recurring_batch_frequency: form.recurring_batch_frequency,
          recurring_batch_day_of_week: form.recurring_batch_day_of_week ? parseInt(form.recurring_batch_day_of_week) : null,
          recurring_batch_day_of_month: form.recurring_batch_day_of_month ? parseInt(form.recurring_batch_day_of_month) : null,
          recurring_batch_time: form.recurring_batch_time || null,
        } as any)
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-details", store.id] });
      toast.success("Schedule settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Upload hero image
  const uploadHeroImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `heroes/${store.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-heroes")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("store-heroes")
        .getPublicUrl(path);

      update("hero_image_url", publicUrl);
      toast.success("Hero image uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  // Generate hero with AI
  const generateHero = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-store-hero", {
        body: {
          storeName: form.name || store.name,
          storeType: (storeData as any)?.store_type || "spirit_wear",
          sport: null,
          level: null,
          brandColors: (storeData as any)?.brand_colors || [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.heroImageUrl) {
        update("hero_image_url", data.heroImageUrl);
        toast.success("Hero image generated! Click Save to keep it.");
      } else {
        toast.error("No image was generated. Try again.");
      }
    } catch (e: any) {
      toast.error(`Failed to generate hero: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading store details…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        <p>Failed to load store: {(error as Error).message}</p>
      </div>
    );
  }

  const isLive = form.status === "open";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Store Details</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Name, hero content, status, fundraising, and scheduling for this team store.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Store Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Panthers Spirit Wear"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Short description for internal notes or public display"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              value={form.welcome_message}
              onChange={(e) => update("welcome_message", e.target.value)}
              placeholder="Welcome to the Panthers Spirit Wear store! Browse our gear and support the team."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Shown to shoppers at the top of the store page.</p>
          </div>
        </CardContent>
      </Card>

      {/* Hero Content Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Content</CardTitle>
          <CardDescription>
            The hero banner at the top of the store page. Logo is managed separately in Branding/Logos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.hero_title}
                onChange={(e) => update("hero_title", e.target.value)}
                placeholder="e.g. Panthers Spirit Wear"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={form.hero_subtitle}
                onChange={(e) => update("hero_subtitle", e.target.value)}
                placeholder="e.g. Show your pride — gear up for the season!"
              />
            </div>
          </div>

          {/* Hero Image Preview */}
          <div className="space-y-3">
            <Label>Hero Image</Label>
            {form.hero_image_url ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={form.hero_image_url}
                  alt="Hero preview"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                  <div className="text-white">
                    {form.hero_title && <h3 className="text-lg font-bold">{form.hero_title}</h3>}
                    {form.hero_subtitle && <p className="text-sm opacity-90">{form.hero_subtitle}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-sm">No hero image set</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadHeroImage(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => heroInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Uploading…" : "Upload Hero Image"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateHero}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                {generating ? "Generating…" : "Generate Hero With AI"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use a wide background image that matches this store (sport, school, or company). Logo is separate and managed in Branding/Logos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Store Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Store Status
            {isLive && <Badge className="text-xs">Live</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Open Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.open_at}
                onChange={(e) => update("open_at", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Close Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.close_at}
                onChange={(e) => update("close_at", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Set when your store automatically opens and closes. The system checks every 5–10 minutes.</span>
          </div>
          {isLive && form.open_at && form.close_at && (
            <p className="text-xs text-muted-foreground">
              Open: {new Date(form.open_at).toLocaleString()} — Close: {new Date(form.close_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fundraising Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fundraising
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.fundraising_percent}
                onChange={(e) => update("fundraising_percent", e.target.value)}
                placeholder="e.g. 20"
              />
              <p className="text-xs text-muted-foreground">
                The percentage of each sale that goes towards the fundraising goal.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Goal ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.fundraising_goal}
                onChange={(e) => update("fundraising_goal", e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Order Batching Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recurring Order Batching
          </CardTitle>
          <CardDescription>
            For ongoing stores (like corporate programs), automatically batch orders on a schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.recurring_batch_enabled}
              onCheckedChange={(v) => update("recurring_batch_enabled", v)}
            />
            <Label>Enable Recurring Batching</Label>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Orders will be grouped and marked for production on the schedule you set.</span>
          </div>

          {form.recurring_batch_enabled && (
            <div className="space-y-4 pl-1 border-l-2 border-primary/20 ml-2">
              <div className="space-y-2 pl-4">
                <Label>Frequency</Label>
                <Select
                  value={form.recurring_batch_frequency}
                  onValueChange={(v) => update("recurring_batch_frequency", v)}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(form.recurring_batch_frequency === "weekly" || form.recurring_batch_frequency === "biweekly") && (
                <div className="space-y-2 pl-4">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const selected = parseCsv(form.recurring_batch_day_of_week);
                      const isSelected = selected.includes(String(d.value));
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            const val = String(d.value);
                            const next = isSelected
                              ? selected.filter((v) => v !== val)
                              : [...selected, val];
                            update("recurring_batch_day_of_week", next.join(","));
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          {d.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  {form.recurring_batch_day_of_week && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {parseCsv(form.recurring_batch_day_of_week).map((v) => DAYS_OF_WEEK.find((d) => String(d.value) === v)?.label).filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {form.recurring_batch_frequency === "monthly" && (
                <div className="space-y-2 pl-4">
                  <Label>Days of Month</Label>
                  <div className="grid grid-cols-7 gap-1.5 max-w-xs">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const selected = parseCsv(form.recurring_batch_day_of_month);
                      const isSelected = selected.includes(String(d));
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const val = String(d);
                            const next = isSelected
                              ? selected.filter((v) => v !== val)
                              : [...selected, val];
                            update("recurring_batch_day_of_month", next.join(","));
                          }}
                          className={`w-9 h-9 rounded-md text-sm font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  {form.recurring_batch_day_of_month && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {parseCsv(form.recurring_batch_day_of_month).sort((a, b) => Number(a) - Number(b)).join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pl-4">
                <Label>Time of Day</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Select
                    value={form.recurring_batch_time ? form.recurring_batch_time.split(":")[0] : ""}
                    onValueChange={(h) => {
                      const mins = form.recurring_batch_time ? form.recurring_batch_time.split(":")[1] || "00" : "00";
                      update("recurring_batch_time", `${h}:${mins}`);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const val = String(i).padStart(2, "0");
                        const label = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
                        return <SelectItem key={val} value={val}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground font-medium">:</span>
                  <Select
                    value={form.recurring_batch_time ? form.recurring_batch_time.split(":")[1] || "00" : ""}
                    onValueChange={(m) => {
                      const hrs = form.recurring_batch_time ? form.recurring_batch_time.split(":")[0] || "08" : "08";
                      update("recurring_batch_time", `${hrs}:${m}`);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {["00", "15", "30", "45"].map((m) => (
                        <SelectItem key={m} value={m}>:{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.recurring_batch_time && (
                  <p className="text-xs text-muted-foreground">
                    Batch time: {(() => {
                      const [h, m] = form.recurring_batch_time.split(":");
                      const hr = parseInt(h);
                      return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr < 12 ? "AM" : "PM"}`;
                    })()}
                  </p>
                )}
              </div>

              <div className="pl-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveScheduleMutation.mutate()}
                  disabled={saveScheduleMutation.isPending}
                >
                  {saveScheduleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saveScheduleMutation.isPending ? "Saving…" : "Save Schedule Settings"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
