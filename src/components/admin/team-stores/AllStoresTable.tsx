import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { Search, Trash2, Eye, BarChart3, Heart, X } from "lucide-react";
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
  organization: string | null;
  season: string | null;
  fundraising_percent: number | null;
  ordersCount: number;
  totalSales: number;
  fundsRaised: number;
}

interface AllStoresTableProps {
  statusFilter: StoreStatus | "all";
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Live", variant: "default" },
  scheduled: { label: "Not Launched", variant: "outline" },
  closed: { label: "Closed", variant: "secondary" },
  draft: { label: "Draft", variant: "outline" },
};

export function AllStoresTable({ statusFilter }: AllStoresTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
        .select("id, name, slug, active, status, start_date, end_date, description, organization, season, fundraising_percent")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch real order data
      const { data: orders } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total")
        .neq("status", "cancelled");

      const salesByStore = new Map<string, number>();
      const ordersByStore = new Map<string, number>();

      (orders ?? []).forEach((o: any) => {
        if (o.store_id) {
          salesByStore.set(o.store_id, (salesByStore.get(o.store_id) ?? 0) + Number(o.total ?? 0));
          ordersByStore.set(o.store_id, (ordersByStore.get(o.store_id) ?? 0) + 1);
        }
      });

      return (storeRows ?? []).map((s: any) => {
        const sales = salesByStore.get(s.id) ?? 0;
        const rate = s.fundraising_percent ?? 0;
        return {
          ...s,
          ordersCount: ordersByStore.get(s.id) ?? 0,
          totalSales: sales,
          fundsRaised: sales * (rate / 100),
        };
      });
    },
  });

  const orgOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => { if (s.organization) set.add(s.organization); });
    return Array.from(set).sort();
  }, [stores]);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => { if (s.season) set.add(s.season); });
    return Array.from(set).sort();
  }, [stores]);

  const filtered = useMemo(() => {
    let result = stores;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.organization ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }

    if (orgFilter !== "all") {
      result = result.filter((s) => s.organization === orgFilter);
    }
    if (seasonFilter !== "all") {
      result = result.filter((s) => s.season === seasonFilter);
    }
    if (dateFrom) {
      result = result.filter((s) => (s.start_date ?? "") >= dateFrom || (s.end_date ?? "") >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((s) => (s.start_date ?? "") <= dateTo || (s.end_date ?? "") <= dateTo);
    }

    return result;
  }, [stores, search, statusFilter, orgFilter, seasonFilter, dateFrom, dateTo]);

  const hasExtraFilters = orgFilter !== "all" || seasonFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {orgOptions.length > 0 && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgOptions.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {seasonOptions.length > 0 && (
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasonOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9" placeholder="To" />
        {hasExtraFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setOrgFilter("all"); setSeasonFilter("all"); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 px-4">Loading stores…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 px-4">No stores found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const badge = statusBadge[s.status] ?? statusBadge.scheduled;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell className="text-sm">{s.organization ?? "—"}</TableCell>
                        <TableCell className="text-sm">{s.season ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{s.start_date ?? "—"}</TableCell>
                        <TableCell className="text-sm">{s.end_date ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{s.ordersCount}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${s.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${s.fundsRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate(`/admin/team-stores/${s.id}`)}
                              title="View store"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Store
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate(`/admin/team-stores/${s.id}/reports/summary`)}
                              title="View reports"
                            >
                              <BarChart3 className="w-3.5 h-3.5 mr-1" /> Reports
                            </Button>
                            {(s.fundraising_percent ?? 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => navigate(`/admin/team-stores/${s.id}/reports/fundraising`)}
                                title="View fundraising"
                              >
                                <Heart className="w-3.5 h-3.5 mr-1" /> Fund
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this store and cannot be undone.
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
    </div>
  );
}
