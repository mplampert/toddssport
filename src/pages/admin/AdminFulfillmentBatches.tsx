import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGlobalBatches, useUpdateBatchStatus, useCreateBatch, BATCH_STATUSES } from "@/hooks/useFulfillmentBatches";
import { useStoreReportData } from "@/hooks/useStoreReportData";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, Eye, Search, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", ready: "Ready", in_production: "In Production", shipped: "Shipped", complete: "Complete",
};

function useAllStores() {
  return useQuery({
    queryKey: ["all-team-stores-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function AdminFulfillmentBatches() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: batches = [], isLoading } = useGlobalBatches();
  const updateStatus = useUpdateBatchStatus();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [storeFilter, setStoreFilter] = useState("all");

  // Force batch state
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const { data: stores = [] } = useAllStores();

  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((b) => map.set(b.team_store_id, b.store_name ?? "Unknown"));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [batches]);

  const filtered = batches.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (storeFilter !== "all" && b.team_store_id !== storeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.store_name?.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="w-7 h-7" />
              Fulfillment Batches
            </h1>
            <p className="text-muted-foreground mt-1">All batches across all stores.</p>
          </div>
          <Button onClick={() => setShowStorePicker(true)}>
            <Zap className="w-4 h-4 mr-1" />
            Force Batch
          </Button>
        </div>

        {/* Store Picker Dialog */}
        <Dialog open={showStorePicker} onOpenChange={setShowStorePicker}>
          <DialogContent>
            <DialogHeader><DialogTitle>Force Batch — Select Store</DialogTitle></DialogHeader>
            <Select value={selectedStoreId ?? ""} onValueChange={(v) => setSelectedStoreId(v)}>
              <SelectTrigger><SelectValue placeholder="Choose a store…" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button
                disabled={!selectedStoreId}
                onClick={() => { setShowStorePicker(false); setShowForceConfirm(true); }}
              >
                Next
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Force Batch Confirm for selected store */}
        {selectedStoreId && (
          <ForceBatchConfirm
            storeId={selectedStoreId}
            storeName={stores.find((s) => s.id === selectedStoreId)?.name ?? ""}
            open={showForceConfirm}
            onOpenChange={(open) => { setShowForceConfirm(open); if (!open) setSelectedStoreId(null); }}
            onCreated={(batchId) => {
              setShowForceConfirm(false);
              setSelectedStoreId(null);
              navigate(`/admin/team-stores/${selectedStoreId}/fulfillment/batch/${batchId}`);
            }}
          />
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search store or batch ID…" className="pl-9 w-64" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              {BATCH_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Store" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Stores</SelectItem>
              {storeOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No batches found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cutoff</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{b.store_name}</TableCell>
                      <TableCell>
                        <Badge variant={b.batch_type === "manual" ? "destructive" : "secondary"} className="text-xs">
                          {b.batch_type === "manual" ? "Manual" : "Scheduled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(b.cutoff_datetime).toLocaleDateString()}</TableCell>
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
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/team-stores/${b.team_store_id}/fulfillment/batch/${b.id}`)}>
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
    </AdminLayout>
  );
}

/* ---- Force Batch Confirm sub-component ---- */
function ForceBatchConfirm({ storeId, storeName, open, onOpenChange, onCreated }: {
  storeId: string; storeName: string; open: boolean;
  onOpenChange: (o: boolean) => void; onCreated: (batchId: string) => void;
}) {
  const { orders } = useStoreReportData(storeId);
  const { data: batches = [] } = useGlobalBatches();
  const createBatch = useCreateBatch(storeId);

  const batchedIds = new Set<string>();
  batches.filter((b) => b.team_store_id === storeId).forEach((b) => b.order_ids?.forEach((id) => batchedIds.add(id)));
  const unbatched = orders.filter((o) => !batchedIds.has(o.id));

  const handleConfirm = () => {
    if (unbatched.length === 0) { toast.error("No unbatched orders"); return; }
    createBatch.mutate(
      { orderIds: unbatched.map((o) => o.id), batchType: "manual", status: "ready" },
      { onSuccess: onCreated },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Force Batch — {storeName}</AlertDialogTitle>
          <AlertDialogDescription>
            Create a manual batch with {unbatched.length} unbatched order{unbatched.length !== 1 ? "s" : ""}?
            It will be set to Ready status immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={createBatch.isPending || unbatched.length === 0}>
            {createBatch.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            Create &amp; View Batch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
