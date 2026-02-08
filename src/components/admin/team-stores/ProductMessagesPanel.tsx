import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Loader2, MessageSquare,
  Info, AlertTriangle, AlertCircle, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const STYLE_VARIANTS = [
  { value: "info", label: "Info", icon: Info, color: "bg-blue-50 border-blue-200 text-blue-800" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  { value: "danger", label: "Urgent", icon: AlertCircle, color: "bg-red-50 border-red-200 text-red-800" },
  { value: "success", label: "Success", icon: CheckCircle, color: "bg-green-50 border-green-200 text-green-800" },
];

interface Props {
  storeId: string;
  productId: string;
}

const EMPTY_FORM = { title: "", content: "", style_variant: "info", is_active: true };

export function ProductMessagesPanel({ storeId, productId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["product-messages", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_messages")
        .select("*")
        .eq("team_store_id", storeId)
        .eq("product_id", productId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.content.trim()) throw new Error("Content is required");
      const payload = {
        team_store_id: storeId,
        product_id: productId,
        location: "product" as const,
        title: form.title.trim() || null,
        content: form.content.trim(),
        style_variant: form.style_variant,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("team_store_messages").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_store_messages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-messages", productId] });
      toast.success(editingId ? "Message updated" : "Message added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_store_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-messages", productId] });
      toast.success("Message deleted");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(msg: any) {
    setEditingId(msg.id);
    setForm({ title: msg.title || "", content: msg.content, style_variant: msg.style_variant, is_active: msg.is_active });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
  }

  const getVariant = (v: string) => STYLE_VARIANTS.find((s) => s.value === v) || STYLE_VARIANTS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Product Messages ({messages.length})
        </Label>
        <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={openCreate}>
          <Plus className="w-3 h-3 mr-0.5" /> Add
        </Button>
      </div>

      {messages.length > 0 && (
        <div className="space-y-1.5">
          {messages.map((msg: any) => {
            const v = getVariant(msg.style_variant);
            const Icon = v.icon;
            return (
              <div key={msg.id} className={`flex items-start gap-2 p-2 rounded border text-xs ${v.color} ${!msg.is_active ? "opacity-50" : ""}`}>
                <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  {msg.title && <span className="font-semibold mr-1">{msg.title}:</span>}
                  <span dangerouslySetInnerHTML={{ __html: msg.content }} className="[&_b]:font-bold [&_i]:italic [&_a]:underline" />
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => openEdit(msg)} className="p-0.5 hover:bg-black/10 rounded">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => setDeleteId(msg.id)} className="p-0.5 hover:bg-black/10 rounded text-red-700">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product Message" : "Add Product Message"}</DialogTitle>
            <DialogDescription>This message appears only on this product's detail page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <Select value={form.style_variant} onValueChange={(v) => setForm((f) => ({ ...f, style_variant: v }))}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {STYLE_VARIANTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title (optional)</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Production Time" className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              <div className="flex gap-1 mb-1">
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px] font-bold"
                  onClick={() => {
                    const ta = document.getElementById("prod-msg-content") as HTMLTextAreaElement | null;
                    if (!ta) return;
                    const s = ta.selectionStart, e = ta.selectionEnd;
                    const t = form.content;
                    setForm((f) => ({ ...f, content: t.slice(0, s) + `<b>${t.slice(s, e)}</b>` + t.slice(e) }));
                  }}>B</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px] italic"
                  onClick={() => {
                    const ta = document.getElementById("prod-msg-content") as HTMLTextAreaElement | null;
                    if (!ta) return;
                    const s = ta.selectionStart, e = ta.selectionEnd;
                    const t = form.content;
                    setForm((f) => ({ ...f, content: t.slice(0, s) + `<i>${t.slice(s, e)}</i>` + t.slice(e) }));
                  }}>I</Button>
              </div>
              <Textarea
                id="prod-msg-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder='e.g. This jersey takes <b>4–6 weeks</b> to produce.'
                rows={3}
                className="text-xs"
              />
            </div>
            {form.content.trim() && (
              <div className={`p-2 rounded border text-xs ${getVariant(form.style_variant).color}`}>
                <div className="flex items-start gap-1.5">
                  {(() => { const V = getVariant(form.style_variant); const I = V.icon; return <I className="w-3 h-3 mt-0.5 shrink-0" />; })()}
                  <div>
                    {form.title && <span className="font-semibold mr-1">{form.title}:</span>}
                    <span dangerouslySetInnerHTML={{ __html: form.content }} className="[&_b]:font-bold [&_i]:italic [&_a]:underline" />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
