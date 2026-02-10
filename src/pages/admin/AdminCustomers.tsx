import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Users, ChevronRight, Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  notes: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  total_orders: number;
  last_order_date: string | null;
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", organization: "", notes: "",
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      // Fetch customers
      const { data: custs, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch order counts & last order dates
      const { data: orderStats } = await supabase
        .from("team_store_orders")
        .select("customer_email, created_at")
        .eq("is_sample", false)
        .order("created_at", { ascending: false });

      // Build stats by email
      const statsByEmail: Record<string, { count: number; lastDate: string }> = {};
      for (const o of orderStats || []) {
        const email = (o.customer_email || "").toLowerCase();
        if (!email) continue;
        if (!statsByEmail[email]) {
          statsByEmail[email] = { count: 0, lastDate: o.created_at };
        }
        statsByEmail[email].count++;
      }

      return (custs || []).map((c: any) => {
        const stats = statsByEmail[(c.email || "").toLowerCase()];
        return {
          ...c,
          total_orders: stats?.count || 0,
          last_order_date: stats?.lastDate || null,
        } as CustomerRow;
      });
    },
  });

  const addMut = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await supabase.from("customers").insert({
        name: f.name,
        email: f.email,
        phone: f.phone || null,
        organization: f.organization || null,
        notes: f.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Customer added" });
      setAddOpen(false);
      setForm({ name: "", email: "", phone: "", organization: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.organization || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-accent" />
              Customers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer records across all team stores
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold">{customers.filter((c) => c.status === "active").length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500" />
              <div>
                <p className="text-2xl font-bold">{customers.filter((c) => c.total_orders > 0).length}</p>
                <p className="text-xs text-muted-foreground">With Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{customers.filter((c) => c.status === "inactive").length}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {search ? "No customers match your search" : "No customers yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link to={`/admin/customers/${c.id}`} className="hover:text-accent">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>{c.organization || "—"}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="text-center">{c.total_orders}</TableCell>
                      <TableCell>
                        {c.last_order_date
                          ? format(new Date(c.last_order_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/customers/${c.id}`}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Add Customer Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Manually add a customer for phone or email orders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Organization</Label>
                <Input
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addMut.mutate(form)}
                disabled={!form.name.trim() || !form.email.trim() || addMut.isPending}
              >
                {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
