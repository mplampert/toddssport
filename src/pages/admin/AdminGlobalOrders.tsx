import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useGlobalOrders, type GlobalOrder } from "@/hooks/useGlobalOrders";
import { useGlobalBatches } from "@/hooks/useFulfillmentBatches";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Loader2, Download, ArrowUpDown } from "lucide-react";
import { downloadCSV } from "@/hooks/useStoreReportData";

type SortKey = "order_number" | "created_at" | "customer_name" | "store_name" | "total" | "payment_status";

export default function AdminGlobalOrders() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: orders = [], isLoading } = useGlobalOrders();
  const { data: batches = [] } = useGlobalBatches();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Build batch lookup: orderId -> batchId
  const orderBatchMap = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((b) => b.order_ids?.forEach((oid) => map.set(oid, b.id)));
    return map;
  }, [batches]);

  // Unique stores for filter
  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.store_id, o.store_name ?? "Unknown"));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          orderBatchMap.get(o.id)?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((o) => o.payment_status === statusFilter);
    if (storeFilter !== "all") list = list.filter((o) => o.store_id === storeFilter);

    // Sort
    list = [...list].sort((a, b) => {
      let av: any = (a as any)[sortKey] ?? "";
      let bv: any = (b as any)[sortKey] ?? "";
      if (sortKey === "total") { av = Number(av); bv = Number(bv); }
      if (sortKey === "created_at") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [orders, search, statusFilter, storeFilter, sortKey, sortAsc, orderBatchMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label}<ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const handleExport = () => {
    const headers = ["Order #", "Date", "Customer", "Email", "Store", "Total", "Status", "Batch"];
    const rows = filtered.map((o) => [
      o.order_number, new Date(o.created_at).toLocaleDateString(), o.customer_name ?? "", o.customer_email ?? "",
      o.store_name ?? "", Number(o.total).toFixed(2), o.payment_status, orderBatchMap.get(o.id)?.slice(0, 8) ?? "",
    ]);
    downloadCSV("orders-export.csv", headers, rows);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-7 h-7" />
              All Orders
            </h1>
            <p className="text-muted-foreground mt-1">Search and manage orders across all stores.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, email, batch ID…"
              className="pl-9 w-80"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
              <p className="text-center py-10 text-muted-foreground">No orders found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Order #" k="order_number" />
                    <SortHeader label="Date" k="created_at" />
                    <SortHeader label="Customer" k="customer_name" />
                    <SortHeader label="Store" k="store_name" />
                    <SortHeader label="Total" k="total" />
                    <SortHeader label="Status" k="payment_status" />
                    <TableHead>Batch</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((o) => {
                    const batchId = orderBatchMap.get(o.id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">
                          <div>{o.customer_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{o.store_name}</TableCell>
                        <TableCell className="text-sm">${Number(o.total).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="secondary">{o.payment_status}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{batchId ? batchId.slice(0, 8) : "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/team-stores/${o.store_id}/orders/${o.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Showing first 200 of {filtered.length} results.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
