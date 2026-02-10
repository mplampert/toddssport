import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalBatches, useUpdateBatchStatus, BATCH_STATUSES } from "@/hooks/useFulfillmentBatches";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Eye, Search, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", ready: "Ready", in_production: "In Production", shipped: "Shipped", complete: "Complete",
};

export default function AdminFulfillmentBatches() {
  const navigate = useNavigate();
  const { data: batches = [], isLoading } = useGlobalBatches();
  const updateStatus = useUpdateBatchStatus();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = batches.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.store_name?.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-7 h-7" />
            Fulfillment Batches
          </h1>
          <p className="text-muted-foreground mt-1">All batches across all stores.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store or batch ID…"
              className="pl-9 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              {BATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No batches found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Store</TableHead>
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
                      <TableCell className="text-sm">{new Date(b.cutoff_datetime).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{b.order_ids?.length ?? 0}</TableCell>
                      <TableCell>
                        <Select
                          value={b.status}
                          onValueChange={(v) => updateStatus.mutate({ batchId: b.id, status: v })}
                        >
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {BATCH_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/team-stores/${b.team_store_id}/fulfillment/batch/${b.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
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
