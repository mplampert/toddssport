import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type StoreStatus = "scheduled" | "open" | "closed";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  status: StoreStatus;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  ordersCount: number;
  totalSales: number;
}

interface AllStoresTableProps {
  statusFilter: StoreStatus | "all";
}

const statusBadge: Record<StoreStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", variant: "default" },
  scheduled: { label: "Scheduled", variant: "outline" },
  closed: { label: "Closed", variant: "secondary" },
};

export function AllStoresTable({ statusFilter }: AllStoresTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase.from("team_stores").delete().eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-all-stores-table"] });
      queryClient.invalidateQueries({ queryKey: ["team-store-kpis"] });
      toast.success("Store deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: stores = [], isLoading } = useQuery<StoreRow[]>({
    queryKey: ["team-store-all-stores-table"],
    queryFn: async () => {
      const { data: storeRows, error } = await supabase
        .from("team_stores")
        .select("id, name, slug, active, status, start_date, end_date, description")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("team_store_id, unit_price, quantity")
        .not("team_store_id", "is", null);

      const { data: orders } = await supabase
        .from("champro_orders")
        .select("id, request_payload");

      const salesByStore = new Map<string, number>();
      const ordersByStore = new Map<string, number>();

      (cartItems ?? []).forEach((ci: any) => {
        if (ci.team_store_id) {
          salesByStore.set(
            ci.team_store_id,
            (salesByStore.get(ci.team_store_id) ?? 0) + (ci.unit_price ?? 0) * (ci.quantity ?? 0)
          );
        }
      });

      (orders ?? []).forEach((o: any) => {
        const storeId = o.request_payload?.team_store_id;
        if (storeId) {
          ordersByStore.set(storeId, (ordersByStore.get(storeId) ?? 0) + 1);
        }
      });

      return (storeRows ?? []).map((s: any) => ({
        ...s,
        ordersCount: ordersByStore.get(s.id) ?? 0,
        totalSales: salesByStore.get(s.id) ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    let result = stores;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [stores, search, statusFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">
            {statusFilter === "all" ? "All Stores" : `${statusBadge[statusFilter].label} Stores`}
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading stores…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No stores found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Close</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const badge = statusBadge[s.status] ?? statusBadge.scheduled;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.start_date ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.end_date ?? "—"}</TableCell>
                      <TableCell className="text-center">{s.ordersCount}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${s.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/admin/team-stores/${s.id}`)}
                          >
                            {s.status === "closed" ? "View Report" : "Manage"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this store and cannot be undone. Orders and related data may become orphaned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(s.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
