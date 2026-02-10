import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import StoreNotificationSettings from "@/components/admin/team-stores/StoreNotificationSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings, Mail, MessageSquare, Bell, Save, Loader2, Plus, Pencil, Trash2,
  Users, Send, ArrowLeft, Search, Phone, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format } from "date-fns";

/* ========== GLOBAL SETTINGS TAB ========== */
function GlobalSettingsTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["global-notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_notification_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);

  // sync form when data loads
  if (settings && !form) {
    setForm({ ...settings });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase
        .from("global_notification_settings")
        .update({
          email_from_address: form.email_from_address,
          email_reply_to: form.email_reply_to,
          email_sending_domain: form.email_sending_domain,
          sms_messaging_service_sid: form.sms_messaging_service_sid,
          sms_sender_phone: form.sms_sender_phone,
          sms_compliance_message: form.sms_compliance_message,
          default_email_enabled: form.default_email_enabled,
          default_sms_enabled: form.default_sms_enabled,
        })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-notification-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }

  const update = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>From Address</Label><Input value={form.email_from_address} onChange={(e) => update("email_from_address", e.target.value)} /></div>
          <div><Label>Reply-To</Label><Input value={form.email_reply_to || ""} onChange={(e) => update("email_reply_to", e.target.value)} /></div>
          <div><Label>Sending Domain</Label><Input value={form.email_sending_domain || ""} onChange={(e) => update("email_sending_domain", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> SMS Settings (Twilio)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>Messaging Service SID</Label><Input value={form.sms_messaging_service_sid || ""} onChange={(e) => update("sms_messaging_service_sid", e.target.value)} /></div>
          <div><Label>Sender Phone</Label><Input value={form.sms_sender_phone || ""} onChange={(e) => update("sms_sender_phone", e.target.value)} placeholder="+1234567890" /></div>
          <div><Label>Compliance Message</Label><Input value={form.sms_compliance_message || ""} onChange={(e) => update("sms_compliance_message", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Default Toggles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-8">
          <div className="flex items-center gap-3">
            <Switch checked={form.default_email_enabled} onCheckedChange={(v) => update("default_email_enabled", v)} />
            <Label>Email notifications enabled</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.default_sms_enabled} onCheckedChange={(v) => update("default_sms_enabled", v)} />
            <Label>SMS notifications enabled</Label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}

/* ========== TEMPLATES TAB ========== */
function TemplatesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    template_key: "",
    channel: "email",
    name: "",
    subject: "",
    body: "",
    is_active: true,
    email_enabled: true,
    sms_enabled: true,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("template_key")
        .order("channel");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.template_key || !form.body) throw new Error("Key and body required");
      const payload = {
        template_key: form.template_key,
        channel: form.channel,
        name: form.name,
        subject: form.channel === "email" ? form.subject : null,
        body: form.body,
        is_active: form.is_active,
        email_enabled: form.email_enabled,
        sms_enabled: form.sms_enabled,
      };
      if (editingId) {
        const { error } = await supabase.from("notification_templates").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notification_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success(editingId ? "Template updated" : "Template created");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(t: any) {
    setEditingId(t.id);
    setForm({
      template_key: t.template_key,
      channel: t.channel,
      name: t.name,
      subject: t.subject || "",
      body: t.body,
      is_active: t.is_active,
      email_enabled: t.email_enabled,
      sms_enabled: t.sms_enabled,
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ template_key: "", channel: "email", name: "", subject: "", body: "", is_active: true, email_enabled: true, sms_enabled: true });
    setDialogOpen(true);
  }

  // Group by template_key
  const grouped = templates.reduce((acc: Record<string, any[]>, t: any) => {
    if (!acc[t.template_key]) acc[t.template_key] = [];
    acc[t.template_key].push(t);
    return acc;
  }, {});

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Event-driven email & SMS templates with variable interpolation.</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Template</Button>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([key, tmpls]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(tmpls as any[]).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <div className="flex items-center gap-2">
                      {t.channel === "email" ? <Mail className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-green-500" />}
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">{t.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>Use {"{{variable_name}}"} for dynamic content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Event Key</Label><Input value={form.template_key} onChange={(e) => setForm(f => ({ ...f, template_key: e.target.value }))} placeholder="e.g. order_placed" /></div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            {form.channel === "email" && (
              <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            )}
            <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} rows={6} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ========== CUSTOMERS TAB ========== */
function CustomersTab() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["global-customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*, customer_channels(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["customer-history", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const [notifs, admins, inbound] = await Promise.all([
        supabase.from("notification_events").select("*").eq("customer_id", selectedCustomer.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("admin_messages").select("*").eq("customer_id", selectedCustomer.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("inbound_messages").select("*").eq("customer_id", selectedCustomer.id).order("created_at", { ascending: false }).limit(50),
      ]);
      const all = [
        ...(notifs.data || []).map((n: any) => ({ ...n, type: "notification" })),
        ...(admins.data || []).map((a: any) => ({ ...a, type: "admin_message" })),
        ...(inbound.data || []).map((i: any) => ({ ...i, type: "inbound" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return all;
    },
    enabled: !!selectedCustomer,
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer list */}
      <div className="lg:col-span-1 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {customers.map((c: any) => {
            const ch = c.customer_channels?.[0];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${selectedCustomer?.id === c.id ? "bg-accent text-accent-foreground border-accent" : "hover:bg-muted"}`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.email}</div>
                {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                {ch?.sms_opted_out && <Badge variant="destructive" className="text-[10px] mt-1">SMS Opted Out</Badge>}
              </button>
            );
          })}
          {customers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No customers found.</p>}
        </div>
      </div>

      {/* Customer detail + history */}
      <div className="lg:col-span-2">
        {selectedCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> {selectedCustomer.name}</CardTitle>
              <CardDescription>{selectedCustomer.email} {selectedCustomer.phone && `· ${selectedCustomer.phone}`}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Channel status */}
              {selectedCustomer.customer_channels?.[0] && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Email: {selectedCustomer.customer_channels[0].email_enabled_transactional ? "✓ Enabled" : "✗ Disabled"}</Badge>
                  <Badge variant={selectedCustomer.customer_channels[0].sms_opted_out ? "destructive" : "outline"}>
                    SMS: {selectedCustomer.customer_channels[0].sms_opted_out ? "✗ Opted Out" : "✓ Enabled"}
                  </Badge>
                  {selectedCustomer.customer_channels[0].sms_opted_out_at && (
                    <span className="text-xs text-muted-foreground">
                      Opted out: {format(new Date(selectedCustomer.customer_channels[0].sms_opted_out_at), "MMM d, yyyy")}
                      {selectedCustomer.customer_channels[0].sms_opt_out_keyword && ` (keyword: ${selectedCustomer.customer_channels[0].sms_opt_out_keyword})`}
                    </span>
                  )}
                </div>
              )}

              <h4 className="text-sm font-semibold mb-2">Message History</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded border bg-muted/20 text-sm">
                    {item.type === "notification" && <Bell className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />}
                    {item.type === "admin_message" && <Send className="w-4 h-4 mt-0.5 text-purple-500 shrink-0" />}
                    {item.type === "inbound" && <MessageSquare className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{item.channel || "sms"}</Badge>
                        <Badge variant={item.status === "sent" ? "default" : item.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {item.status || (item.type === "inbound" ? "received" : "unknown")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(item.created_at), "MMM d, h:mm a")}</span>
                      </div>
                      {item.type === "inbound" ? (
                        <p className="mt-1 text-xs">{item.body}</p>
                      ) : (
                        <p className="mt-1 text-xs truncate">{item.template_key || item.subject || item.body?.substring(0, 80)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No message history.</p>}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Select a customer to view their profile and message history.
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== SEND LOG TAB ========== */
function SendLogTab() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["notification-events-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">Recent notification sends and their status.</p>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Time</th>
              <th className="text-left p-3 font-medium">Channel</th>
              <th className="text-left p-3 font-medium">Template</th>
              <th className="text-left p-3 font-medium">Recipient</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Phone Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt: any) => (
              <tr key={evt.id} className="border-t">
                <td className="p-3 text-xs">{format(new Date(evt.created_at), "MMM d, h:mm a")}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{evt.channel}</Badge></td>
                <td className="p-3 font-mono text-xs">{evt.template_key}</td>
                <td className="p-3 text-xs truncate max-w-[200px]">{evt.recipient_address}</td>
                <td className="p-3">
                  <Badge variant={evt.status === "sent" ? "default" : evt.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                    {evt.status}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{evt.phone_selection_reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No events yet.</p>}
      </div>
    </div>
  );
}

/* ========== MAIN PAGE ========== */
export default function AdminNotifications() {
  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications & Messaging
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Global notification settings, templates, customer opt-outs, and messaging. These apply across all team stores.
        </p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Settings</TabsTrigger>
          <TabsTrigger value="defaults"><Bell className="w-4 h-4 mr-1" /> Default Templates</TabsTrigger>
          <TabsTrigger value="templates"><Mail className="w-4 h-4 mr-1" /> Legacy Templates</TabsTrigger>
          <TabsTrigger value="customers"><Users className="w-4 h-4 mr-1" /> Customers</TabsTrigger>
          <TabsTrigger value="log"><Eye className="w-4 h-4 mr-1" /> Send Log</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4"><GlobalSettingsTab /></TabsContent>
        <TabsContent value="defaults" className="mt-4"><StoreNotificationSettings /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
        <TabsContent value="log" className="mt-4"><SendLogTab /></TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
