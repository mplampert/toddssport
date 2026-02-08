import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Loader2, MessageSquare, Info, AlertTriangle, AlertCircle, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const LOCATIONS = [
  { value: "home", label: "Home Page" },
  { value: "product", label: "Product Page" },
  { value: "checkout", label: "Checkout Page" },
  { value: "global", label: "Global (All Pages)" },
];

const STYLE_VARIANTS = [
  { value: "info", label: "Info (Blue)", icon: Info, color: "bg-blue-50 border-blue-200 text-blue-800" },
  { value: "warning", label: "Warning (Yellow)", icon: AlertTriangle, color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  { value: "danger", label: "Urgent (Red)", icon: AlertCircle, color: "bg-red-50 border-red-200 text-red-800" },
  { value: "success", label: "Success (Green)", icon: CheckCircle, color: "bg-green-50 border-green-200 text-green-800" },
];

interface StoreMessage {
  id: string;
  team_store_id: string;
  location: string;
  title: string | null;
  content: string;
  style_variant: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  storeId: string;
}

const EMPTY_FORM = {
  location: "home",
  title: "",
  content: "",
  style_variant: "info",
  is_active: true,
};

export function StoreMessagesManager({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["store-messages", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_messages")
        .select("*")
        .eq("team_store_id", storeId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as StoreMessage[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.content.trim()) throw new Error("Message content is required");

      const payload = {
        team_store_id: storeId,
        location: form.location,
        title: form.title.trim() || null,
        content: form.content.trim(),
        style_variant: form.style_variant,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("team_store_messages")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_store_messages")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-messages", storeId] });
      toast.success(editingId ? "Message updated" : "Message created");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_store_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-messages", storeId] });
      toast.success("Message deleted");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("team_store_messages")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-messages", storeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(msg: StoreMessage) {
    setEditingId(msg.id);
    setForm({
      location: msg.location,
      title: msg.title || "",
      content: msg.content,
      style_variant: msg.style_variant,
      is_active: msg.is_active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  const getVariantStyle = (variant: string) =>
    STYLE_VARIANTS.find((v) => v.value === variant) || STYLE_VARIANTS[0];

  const getLocationLabel = (loc: string) =>
    LOCATIONS.find((l) => l.value === loc)?.label || loc;

  // Toolbar formatting helpers
  function wrapSelection(tag: string) {
    const textarea = document.getElementById("msg-content") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.content;
    const selected = text.slice(start, end);
    const wrapped = `<${tag}>${selected}</${tag}>`;
    const newContent = text.slice(0, start) + wrapped + text.slice(end);
    setForm((f) => ({ ...f, content: newContent }));
  }

  function insertLink() {
    const url = prompt("Enter URL:");
    if (!url) return;
    const textarea = document.getElementById("msg-content") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.content;
    const selected = text.slice(start, end) || "link text";
    const link = `<a href="${url}" target="_blank" class="underline font-medium">${selected}</a>`;
    const newContent = text.slice(0, start) + link + text.slice(end);
    setForm((f) => ({ ...f, content: newContent }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading messages…</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Store Messages
            </CardTitle>
            <CardDescription>
              Custom messages shown on the store's home, product, and checkout pages.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Add Message
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Add messages like production times or shipping info for shoppers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const variant = getVariantStyle(msg.style_variant);
                const Icon = variant.icon;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${variant.color} ${!msg.is_active ? "opacity-50" : ""}`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getLocationLabel(msg.location)}
                        </Badge>
                        {!msg.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {msg.title && (
                        <p className="font-semibold text-sm">{msg.title}</p>
                      )}
                      <div
                        className="text-sm mt-0.5 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={msg.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: msg.id, active: v })}
                        className="scale-75"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(msg)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(msg.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Message" : "Add Message"}</DialogTitle>
            <DialogDescription>
              This message will be shown to shoppers on the selected page(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={form.location} onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={form.style_variant} onValueChange={(v) => setForm((f) => ({ ...f, style_variant: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {STYLE_VARIANTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Production Time"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <div className="flex gap-1 mb-1">
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => wrapSelection("b")}>
                  B
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs italic" onClick={() => wrapSelection("i")}>
                  I
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={insertLink}>
                  🔗 Link
                </Button>
              </div>
              <Textarea
                id="msg-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="e.g. Production time is <b>4–6 weeks</b> from store close."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use the toolbar or type HTML tags: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href=&quot;...&quot;&gt;link&lt;/a&gt;
              </p>
            </div>

            {/* Preview */}
            {form.content.trim() && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className={`p-3 rounded-lg border text-sm ${getVariantStyle(form.style_variant).color}`}>
                  <div className="flex items-start gap-2">
                    {(() => { const V = getVariantStyle(form.style_variant); const Icon = V.icon; return <Icon className="w-4 h-4 mt-0.5 shrink-0" />; })()}
                    <div>
                      {form.title && <p className="font-semibold">{form.title}</p>}
                      <div
                        className="[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: form.content }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Update Message" : "Create Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Message?</DialogTitle>
            <DialogDescription>This message will be permanently removed from the store.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
