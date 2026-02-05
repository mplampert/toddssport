import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { TeamStoreProductsDialog } from "@/components/admin/team-stores/TeamStoreProductsDialog";

interface TeamStore {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  slug: "",
  start_date: "",
  end_date: "",
  logo_url: "",
  primary_color: "#000000",
  secondary_color: "#ffffff",
  active: false,
};

export default function AdminTeamStores() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogStore, setProductsDialogStore] = useState<TeamStore | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-team-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TeamStore[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm & { id?: string }) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        logo_url: values.logo_url || null,
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        active: values.active,
      };
      if (values.id) {
        const { error } = await supabase.from("team_stores").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_stores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-stores"] });
      toast.success(editingId ? "Store updated" : "Store created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_stores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-stores"] });
      toast.success("Store deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openEdit = (store: TeamStore) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      slug: store.slug,
      start_date: store.start_date ?? "",
      end_date: store.end_date ?? "",
      logo_url: store.logo_url ?? "",
      primary_color: store.primary_color,
      secondary_color: store.secondary_color,
      active: store.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Stores</h1>
            <p className="text-muted-foreground mt-1">Create and manage team stores (admin only — not public yet)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-cta">
                <Plus className="w-4 h-4 mr-2" /> New Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Store" : "Create Store"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Store Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: editingId ? f.slug : generateSlug(name),
                      }));
                    }}
                    placeholder="Lincoln High Baseball"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="lincoln-high-baseball"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center gap-3">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                  <Label>Active</Label>
                </div>
                <Button type="submit" className="w-full btn-cta" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : editingId ? "Update Store" : "Create Store"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Stores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : stores.length === 0 ? (
              <p className="text-muted-foreground">No team stores yet. Create your first one above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Colors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{s.slug}</TableCell>
                      <TableCell className="text-sm">
                        {s.start_date || "—"} → {s.end_date || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: s.primary_color }} title={s.primary_color} />
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: s.secondary_color }} title={s.secondary_color} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "default" : "secondary"}>
                          {s.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setProductsDialogStore(s)} title="Manage Products">
                            <Package className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this store?")) deleteMutation.mutate(s.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {productsDialogStore && (
        <TeamStoreProductsDialog
          store={productsDialogStore}
          open={!!productsDialogStore}
          onOpenChange={(o) => { if (!o) setProductsDialogStore(null); }}
        />
      )}
    </AdminLayout>
  );
}
