import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Heart } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

export default function ReportStoreFundraising() {
  const { store } = useTeamStoreContext();
  const { orders, items, isLoading } = useStoreReportData(store.id);
  const pct = store.fundraising_percent ?? 0;

  // Load roster players for player-linked breakdown
  const playerIds = [...new Set(items.filter((i) => i.team_roster_player_id).map((i) => i.team_roster_player_id!))];
  const { data: players = [] } = useQuery({
    queryKey: ["report-roster-players", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data } = await supabase
        .from("team_roster_players")
        .select("id, player_first_name, player_last_name, jersey_number")
        .in("id", playerIds);
      return data ?? [];
    },
    enabled: playerIds.length > 0,
  });

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalRaised = pct > 0 ? totalRevenue * (pct / 100) : 0;

  // By player
  const playerStats = useMemo(() => {
    if (playerIds.length === 0) return [];
    const map = new Map<string, { name: string; items: number; sales: number; raised: number }>();
    items.forEach((i) => {
      const pid = i.team_roster_player_id;
      if (!pid) return;
      const c = map.get(pid) ?? { name: "", items: 0, sales: 0, raised: 0 };
      c.items += Number(i.quantity);
      c.sales += Number(i.line_total);
      c.raised += Number(i.line_total) * (pct / 100);
      map.set(pid, c);
    });
    players.forEach((p: any) => {
      const c = map.get(p.id);
      if (c) c.name = `${p.player_first_name ?? ""} ${p.player_last_name ?? ""}`.trim() || `#${p.jersey_number}`;
    });
    return Array.from(map.values()).sort((a, b) => b.raised - a.raised);
  }, [items, players, pct, playerIds]);

  // By product
  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; units: number; sales: number; raised: number }>();
    items.forEach((i) => {
      const name = itemDisplayName(i);
      const c = map.get(name) ?? { name, units: 0, sales: 0, raised: 0 };
      c.units += Number(i.quantity);
      c.sales += Number(i.line_total);
      c.raised += Number(i.line_total) * (pct / 100);
      map.set(name, c);
    });
    return Array.from(map.values()).sort((a, b) => b.raised - a.raised);
  }, [items, pct]);

  // By order
  const orderStats = useMemo(() => {
    return orders.map((o) => ({
      id: o.order_number,
      customer: o.customer_name ?? o.customer_email ?? "—",
      total: Number(o.total),
      raised: Number(o.total) * (pct / 100),
    }));
  }, [orders, pct]);

  const exportCSVHandler = () => {
    downloadCSV(
      `${store.name}-fundraising.csv`,
      ["Order ID", "Customer", "Order Total", "Funds Raised"],
      orderStats.map((o) => [o.id, o.customer, o.total.toFixed(2), o.raised.toFixed(2)])
    );
  };

  if (pct === 0) {
    return (
      <div className="space-y-4">
        <ReportBackLink />
        <h3 className="text-lg font-semibold text-foreground">Fundraising Report</h3>
        <p className="text-muted-foreground text-sm">This store does not have a fundraising percentage configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Fundraising Report</h3>
        <Button variant="outline" size="sm" onClick={exportCSVHandler} disabled={orders.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <Heart className="w-5 h-5 text-accent" />
          <div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : `$${totalRaised.toFixed(2)}`}</p>
            <p className="text-xs text-muted-foreground">Total Funds Raised ({pct}% of ${totalRevenue.toFixed(2)} in sales)</p>
          </div>
        </CardContent>
      </Card>

      {/* By Player */}
      {playerStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By Player / Roster</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-right text-sm">{p.items}</TableCell>
                      <TableCell className="text-right text-sm">${p.sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${p.raised.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Product */}
      <Card>
        <CardHeader><CardTitle className="text-base">By Product</CardTitle></CardHeader>
        <CardContent className="p-0">
          {productStats.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No data.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStats.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-right text-sm">{p.units}</TableCell>
                      <TableCell className="text-right text-sm">${p.sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${p.raised.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Order */}
      <Card>
        <CardHeader><CardTitle className="text-base">By Order</CardTitle></CardHeader>
        <CardContent className="p-0">
          {orderStats.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No orders.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderStats.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{o.id}</TableCell>
                      <TableCell className="text-sm">{o.customer}</TableCell>
                      <TableCell className="text-right text-sm">${o.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${o.raised.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
