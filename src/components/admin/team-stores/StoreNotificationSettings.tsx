import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Plus, Trash2, Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "order_placed", label: "Order Placed" },
  { value: "order_ready", label: "Order Ready for Pickup" },
  { value: "order_shipped", label: "Order Shipped" },
  { value: "store_opened", label: "Store Opened" },
  { value: "store_closed", label: "Store Closed" },
  { value: "payout_sent", label: "Payout Sent" },
];

const SOURCES = [
  { value: "standard_store", label: "Team Stores" },
  { value: "champro_builder", label: "Champro Builder" },
];

const SEND_TO_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "coach", label: "Coach" },
  { value: "internal", label: "Internal" },
];

const PLACEHOLDER_HELP = "Available: {{customer_name}}, {{order_number}}, {{store_name}}, {{order_total}}, {{item_count}}, {{pickup_location}}, {{close_date}}, {{payout_amount}}";

interface NotifSetting {
  id?: string;
  store_id: string | null;
  source: string;
  event_type: string;
  enabled: boolean;
  channel: string;
  send_to: string;
  to_phone: string;
  to_email: string;
  template_text: string;
  template_subject: string;
  _dirty?: boolean;
  _new?: boolean;
}

interface Props {
  storeId?: string; // null = global defaults
  storeName?: string;
}

export default function StoreNotificationSettings({ storeId, storeName }: Props) {
  const [settings, setSettings] = useState<NotifSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSource, setActiveSource] = useState("standard_store");

  useEffect(() => {
    load();
  }, [storeId]);

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("store_notification_settings")
      .select("*")
      .order("event_type")
      .order("channel")
      .order("send_to");

    if (storeId) {
      query.or(`store_id.eq.${storeId},store_id.is.null`);
    } else {
      query.is("store_id", null);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load notification settings");
      console.error(error);
    }
    setSettings((data || []).map((d: any) => ({
      ...d,
      to_phone: d.to_phone || "",
      to_email: d.to_email || "",
      template_subject: d.template_subject || "",
    })));
    setLoading(false);
  };

  const updateField = (idx: number, field: string, value: any) => {
    setSettings(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value, _dirty: true } : s));
  };

  const addSetting = () => {
    setSettings(prev => [...prev, {
      store_id: storeId || null,
      source: activeSource,
      event_type: "order_placed",
      enabled: true,
      channel: "sms",
      send_to: "customer",
      to_phone: "",
      to_email: "",
      template_text: "",
      template_subject: "",
      _dirty: true,
      _new: true,
    }]);
  };

  const removeSetting = async (idx: number) => {
    const s = settings[idx];
    if (s.id && !s._new) {
      await supabase.from("store_notification_settings").delete().eq("id", s.id);
    }
    setSettings(prev => prev.filter((_, i) => i !== idx));
    toast.success("Setting removed");
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const dirty = settings.filter(s => s._dirty);
      for (const s of dirty) {
        const payload = {
          store_id: s.store_id || null,
          source: s.source,
          event_type: s.event_type,
          enabled: s.enabled,
          channel: s.channel,
          send_to: s.send_to,
          to_phone: s.to_phone || null,
          to_email: s.to_email || null,
          template_text: s.template_text,
          template_subject: s.template_subject || null,
        };

        if (s._new || !s.id) {
          await supabase.from("store_notification_settings").insert(payload);
        } else {
          await supabase.from("store_notification_settings").update(payload).eq("id", s.id);
        }
      }
      toast.success("Notification settings saved");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = settings.filter(s => s.source === activeSource);
  // For store-specific view, separate globals from overrides
  const globals = storeId ? filtered.filter(s => !s.store_id) : [];
  const overrides = storeId ? filtered.filter(s => s.store_id === storeId) : filtered;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {storeId ? `Notification Settings — ${storeName || "Store"}` : "Global Default Notifications"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {storeId
              ? "Override global defaults for this store. Unconfigured events use the global template."
              : "Default templates used when no store-specific override exists."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSetting}>
            <Plus className="w-4 h-4 mr-1" /> Add Rule
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving || !settings.some(s => s._dirty)}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs value={activeSource} onValueChange={setActiveSource}>
        <TabsList>
          {SOURCES.map(s => (
            <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SOURCES.map(src => (
          <TabsContent key={src.value} value={src.value} className="space-y-3 mt-3">
            {storeId && globals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Global Defaults (read-only)</p>
                {globals.map((s, idx) => (
                  <Card key={s.id || idx} className="border-dashed opacity-60">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3 text-sm">
                        {s.channel === "sms" ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        <Badge variant="outline">{EVENT_TYPES.find(e => e.value === s.event_type)?.label || s.event_type}</Badge>
                        <Badge variant="secondary">{s.send_to}</Badge>
                        <span className="text-muted-foreground truncate flex-1">{s.template_text.slice(0, 80)}…</span>
                        <Badge variant={s.enabled ? "default" : "destructive"}>{s.enabled ? "On" : "Off"}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {overrides.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No {storeId ? "store-specific" : ""} notification rules for {src.label}. Click "Add Rule" to create one.
              </p>
            )}

            {overrides.map((s, rawIdx) => {
              const idx = settings.indexOf(s);
              return (
                <Card key={s.id || rawIdx} className={s._dirty ? "border-primary/40" : ""}>
                  <CardContent className="py-4 px-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(v) => updateField(idx, "enabled", v)}
                      />
                      <Select value={s.event_type} onValueChange={(v) => updateField(idx, "event_type", v)}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map(e => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={s.channel} onValueChange={(v) => updateField(idx, "channel", v)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={s.send_to} onValueChange={(v) => updateField(idx, "send_to", v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEND_TO_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => removeSetting(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {(s.send_to === "coach" || s.send_to === "internal") && (
                      <div className="grid grid-cols-2 gap-3">
                        {s.channel === "sms" && (
                          <div>
                            <Label className="text-xs">Phone Number</Label>
                            <Input
                              value={s.to_phone}
                              onChange={(e) => updateField(idx, "to_phone", e.target.value)}
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                        )}
                        {s.channel === "email" && (
                          <div>
                            <Label className="text-xs">Email Address</Label>
                            <Input
                              value={s.to_email}
                              onChange={(e) => updateField(idx, "to_email", e.target.value)}
                              placeholder="coach@school.edu"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {s.channel === "email" && (
                      <div>
                        <Label className="text-xs">Subject Line</Label>
                        <Input
                          value={s.template_subject}
                          onChange={(e) => updateField(idx, "template_subject", e.target.value)}
                          placeholder="Order {{order_number}} - {{store_name}}"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">{s.channel === "email" ? "Email Body (HTML)" : "SMS Body"}</Label>
                      <Textarea
                        value={s.template_text}
                        onChange={(e) => updateField(idx, "template_text", e.target.value)}
                        rows={s.channel === "email" ? 5 : 3}
                        placeholder="Your message with {{placeholders}}..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">{PLACEHOLDER_HELP}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
