import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  created_at: string;
  store_id: string;
  storeName: string;
}

export function AllOrdersTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  const { data: storeMap = new Map<string, string>() } = useQuery({
    queryKey: ["team-store-names-map"],
    queryFn: async () => {
      const { data } = await supabase.from("team_stores").select("id, name");
      const map = new Map<string, string>();
      (data ?? []).forEach((s: any) => map.set(s.id, s.name));
      return map;
    },
  });

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["team-store-all-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, order_number, status, customer_name, customer_email, total, created_at, store_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((o: any) => ({ ...o, storeName: "" }));
    },
  });

  const enriched = useMemo(() => {
    return orders.map((o) => ({
      ...o,
      storeName: storeMap.get(o.store_id) ?? "Unknown",
    }));
  }, [orders, storeMap]);

  const statuses = useMemo(() => {
    const set = new Set(enriched.map((o) => o.status));
    return Array.from(set).sort();
  }, [enriched]);

  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    enriched.forEach((o) => map.set(o.store_id, o.storeName));
    return Array.from(map.entries());
  }, [enriched]);

  const filtered = useMemo(() => {
    let result = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_email ?? "").toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          o.storeName.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (storeFilter) result = result.filter((o) => o.store_id === storeFilter);
    return result;
  }, [enriched, search, statusFilter, storeFilter]);

  const hasFilters = search || statusFilter || storeFilter;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">All Team Store Orders</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, customer, or store…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={storeFilter || "__all__"} onValueChange={(v) => setStoreFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-48 h-9">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Stores</SelectItem>
              {storeOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => { setSearch(""); setStatusFilter(""); setStoreFilter(""); }}
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {hasFilters ? "No orders match your filters." : "No team store orders yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                    <TableCell className="text-sm">{o.storeName}</TableCell>
                    <TableCell className="text-sm">{o.customer_name || o.customer_email || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">${Number(o.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "completed" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/team-stores/${o.store_id}/orders/${o.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}