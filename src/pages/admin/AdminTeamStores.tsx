import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Store, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AdminTeamStores() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-team-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeCount = stores.filter((s: any) => s.active).length;
  const totalFundraisingGoal = stores.reduce(
    (sum: number, s: any) => sum + (s.fundraising_goal_amount ?? 0),
    0
  );

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("team_stores")
        .insert({ name, slug })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-stores"] });
      toast.success("Store created");
      setCreateOpen(false);
      setNewName("");
      navigate(`/admin/team-stores/${id}`);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Stores</h1>
            <p className="text-muted-foreground mt-1">Create and manage team stores.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="btn-cta" onClick={() => navigate("/admin/team-stores/new")}>
              <Plus className="w-4 h-4 mr-2" /> New Team Store
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Quick Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Create Team Store</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newName.trim()) return;
                    createMutation.mutate(newName.trim());
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Lincoln High Baseball"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full btn-cta" disabled={createMutation.isPending || !newName.trim()}>
                    {createMutation.isPending ? "Creating…" : "Create & Open"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Active Stores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalFundraisingGoal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Fundraising Goals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stores.length}</p>
                  <p className="text-xs text-muted-foreground">Total Stores</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <TableHead>Active</TableHead>
                    <TableHead>Fundraising Goal</TableHead>
                    <TableHead>Start / End</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{s.slug}</TableCell>
                      <TableCell>
                        <Badge variant={s.active ? "default" : "secondary"}>
                          {s.active ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.fundraising_goal_amount ? `$${s.fundraising_goal_amount.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.start_date || "—"} / {s.end_date || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/admin/team-stores/${s.id}`)}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { if (confirm("Delete this store?")) deleteMutation.mutate(s.id); }}
                          >
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
    </AdminLayout>
  );
}
