import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData } from "@/hooks/useStoreReportData";
import { useStoreBatches, useCreateBatch, useUpdateBatchStatus, BATCH_STATUSES } from "@/hooks/useFulfillmentBatches";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Truck, Plus, Package, Eye, Loader2, Zap } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", ready: "Ready", in_production: "In Production", shipped: "Shipped", complete: "Complete",
};

export default function StoreFulfillment() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();
  const { orders, isLoading: ordersLoading } = useStoreReportData(store.id);
  const { data: batches = [], isLoading: batchesLoading } = useStoreBatches(store.id);
  const createBatch = useCreateBatch(store.id);
  const updateStatus = useUpdateBatchStatus();
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const batchedOrderIds = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => b.order_ids?.forEach((id) => set.add(id)));
    return set;
  }, [batches]);

  const unbatchedOrders = useMemo(
    () => orders.filter((o) => !batchedOrderIds.has(o.id)),
    [orders, batchedOrderIds],
  );

  const handleCreateBatch = () => {
    if (unbatchedOrders.length === 0) return;
    createBatch.mutate({ orderIds: unbatchedOrders.map((o) => o.id) });
  };

  const handleForceBatch = () => {
    if (unbatchedOrders.length === 0) return;
    createBatch.mutate(
      { orderIds: unbatchedOrders.map((o) => o.id), batchType: "manual", status: "ready" },
      {
        onSuccess: (batchId) => {
          setShowForceConfirm(false);
          navigate(`/admin/team-stores/${store.id}/fulfillment/batch/${batchId}`);
        },
      },
    );
  };

  const isLoading = ordersLoading || batchesLoading;
  const nextBatchNumber = batches.length + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fulfillment</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Batch orders for production, packing, and supplier POs.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => setShowForceConfirm(true)}
          disabled={unbatchedOrders.length === 0 || createBatch.isPending}
        >
          <Zap className="w-4 h-4 mr-1" />
          Force Batch Now
        </Button>
      </div>

      {/* Force Batch Confirmation */}
      <AlertDialog open={showForceConfirm} onOpenChange={setShowForceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Batch Now</AlertDialogTitle>
            <AlertDialogDescription>
              Create Batch #{nextBatchNumber} with {unbatchedOrders.length} order{unbatchedOrders.length !== 1 ? "s" : ""}?
              This will be tagged as a manual batch and set to Ready status immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceBatch} disabled={createBatch.isPending}>
              {createBatch.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Create &amp; View Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-2xl font-bold">{unbatchedOrders.length}</p><p className="text-xs text-muted-foreground">Unbatched Orders</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-2xl font-bold">{batches.filter((b) => b.status === "draft").length}</p><p className="text-xs text-muted-foreground">Draft Batches</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-2xl font-bold">{batches.filter((b) => b.status === "in_production").length}</p><p className="text-xs text-muted-foreground">In Production</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4 text-center"><p className="text-2xl font-bold">{batches.filter((b) => b.status === "complete").length}</p><p className="text-xs text-muted-foreground">Complete</p></CardContent></Card>
      </div>

      {/* Unbatched Orders */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Unbatched Orders</CardTitle>
            <CardDescription>Orders not yet assigned to a fulfillment batch.</CardDescription>
          </div>
          <Button onClick={handleCreateBatch} disabled={unbatchedOrders.length === 0 || createBatch.isPending} size="sm" variant="outline">
            {createBatch.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Create Draft Batch ({unbatchedOrders.length})
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : unbatchedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All orders are batched.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {unbatchedOrders.slice(0, 50).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="text-sm">{o.customer_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">${Number(o.total).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="secondary">{o.payment_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Batches List */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />Batches</CardTitle></CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No batches yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Cutoff</TableHead><TableHead>Orders</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant={b.batch_type === "manual" ? "destructive" : "secondary"} className="text-xs">
                        {b.batch_type === "manual" ? "Manual" : "Scheduled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(b.cutoff_datetime).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{b.order_ids?.length ?? 0}</TableCell>
                    <TableCell>
                      <Select value={b.status} onValueChange={(v) => updateStatus.mutate({ batchId: b.id, status: v })}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {BATCH_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/team-stores/${store.id}/fulfillment/batch/${b.id}`)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
