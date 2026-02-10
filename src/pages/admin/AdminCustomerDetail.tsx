import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ExternalLink, Loader2, Package, Save, Store, User,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", organization: "", notes: "", status: "active",
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load form when customer loads
  const formLoaded = form.email === customer?.email;
  if (customer && !formLoaded && !editing) {
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      organization: (customer as any).organization || "",
      notes: (customer as any).notes || "",
      status: (customer as any).status || "active",
    });
  }

  // Fetch orders by email match
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-customer-orders", customer?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, order_number, created_at, total, status, payment_status, store_id, fulfillment_status, team_stores!inner(name)")
        .eq("customer_email", customer!.email)
        .eq("is_sample", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((o: any) => ({
        ...o,
        store_name: o.team_stores?.name || "Unknown",
      }));
    },
    enabled: !!customer?.email,
  });

  // Unique stores ordered from
  const storeMap = new Map<string, string>();
  orders.forEach((o: any) => storeMap.set(o.store_id, o.store_name));
  const storesOrderedFrom = Array.from(storeMap.entries());

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("customers")
        .update({
          name: form.name,
          phone: form.phone || null,
          organization: form.organization || null,
          notes: form.notes || null,
          status: form.status,
        } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Customer updated" });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold mb-2">Customer Not Found</h2>
          <Link to="/admin/customers" className="text-accent hover:underline">← Back to Customers</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> All Customers
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <User className="w-7 h-7 text-accent" />
            {customer.name}
          </h1>
          <div className="flex gap-2">
            {customer.user_id && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/account/orders`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View as Customer
                </Link>
              </Button>
            )}
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : (
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={form.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Organization</Label>
                  <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span>{customer.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span>{customer.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Organization: </span>
                  <span>{(customer as any).organization || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={(customer as any).status === "active" ? "default" : "secondary"}>
                    {(customer as any).status || "active"}
                  </Badge>
                </div>
                {(customer as any).notes && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Notes: </span>
                    <span>{(customer as any).notes}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Customer since: </span>
                  <span>{format(new Date(customer.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stores ordered from */}
        {storesOrderedFrom.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-accent" />
                Stores Ordered From
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {storesOrderedFrom.map(([storeId, storeName]) => (
                  <Link key={storeId} to={`/admin/team-stores/${storeId}`}>
                    <Badge variant="outline" className="hover:bg-accent/10 cursor-pointer">
                      {storeName}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" />
              Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No orders yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.order_number}</TableCell>
                      <TableCell>{o.store_name}</TableCell>
                      <TableCell>{format(new Date(o.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{o.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmt(o.total)}</TableCell>
                      <TableCell>
                        <Link to={`/admin/team-stores/${o.store_id}/orders/${o.id}`}>
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Link>
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
