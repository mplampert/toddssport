import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStoreOrders, useOrderPayments, computePaymentStatus, type StoreOrder } from "@/hooks/useStoreOrders";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, X, FlaskConical, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  storeId: string;
}

function PaymentBadge({ orderId, total }: { orderId: string; total: number }) {
  const { data: payments = [] } = useOrderPayments(orderId);
  const { status } = computePaymentStatus(payments, total);
  const variant = status === "paid" ? "default" : status === "partial" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export function OrdersListTable({ storeId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useStoreOrders(storeId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [hideSamples, setHideSamples] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sampleCount = useMemo(() => orders.filter((o) => o.is_sample).length, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (hideSamples) result = result.filter((o) => !o.is_sample);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          (o.customer_email ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (sourceFilter) result = result.filter((o) => o.source === sourceFilter);
    return result;
  }, [orders, search, statusFilter, sourceFilter, hideSamples]);

  const hasFilters = search || statusFilter || sourceFilter || hideSamples;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-sample-orders", {
        body: { storeId, count: 15 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Created ${data.count} sample orders.`);
      qc.invalidateQueries({ queryKey: ["team-store-orders", storeId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate sample orders");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowDeleteConfirm(false);
    try {
      const { data, error } = await supabase.functions.invoke("delete-sample-orders", {
        body: { storeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} sample orders.`);
      qc.invalidateQueries({ queryKey: ["team-store-orders", storeId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete sample orders");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Orders</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-1" />}
              Generate Sample Orders
            </Button>
            {sampleCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Delete Sample Orders ({sampleCount})
              </Button>
            )}
            <Button size="sm" onClick={() => navigate(`/admin/team-stores/${storeId}/orders/new`)}>
              <Plus className="w-4 h-4 mr-1" /> Create Manual Order
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by order #, name, email…" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter || "__all__"} onValueChange={(v) => setSourceFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="hide-samples" checked={hideSamples} onCheckedChange={setHideSamples} />
            <Label htmlFor="hide-samples" className="text-sm whitespace-nowrap">Hide samples</Label>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setStatusFilter(""); setSourceFilter(""); setHideSamples(false); }}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{hasFilters ? "No orders match." : "No orders yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/admin/team-stores/${storeId}/orders/${o.id}`)}>
                    <TableCell className="font-mono text-sm">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {o.order_number}
                        {o.source === "manual" && <Badge variant="outline" className="text-xs">Manual</Badge>}
                        {o.is_sample && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Sample</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{o.customer_name || o.customer_email || "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "completed" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                    <TableCell><PaymentBadge orderId={o.id} total={o.total} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">${Number(o.total).toFixed(2)}</TableCell>
                    <TableCell className="text-sm capitalize">{o.fulfillment_method.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sample Orders?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {sampleCount} sample orders for this store, including their line items and payments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete {sampleCount} Sample Orders</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
