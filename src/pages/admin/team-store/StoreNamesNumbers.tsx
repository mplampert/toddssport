import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Users, X } from "lucide-react";

interface NameNumberRow {
  itemId: string;
  playerName: string;
  jerseyNumber: string;
  size: string;
  product: string;
  quantity: number;
  orderNumber: string;
  orderId: string;
  fulfillmentStatus: string;
}

function getSize(variant: any): string {
  if (!variant) return "—";
  if (typeof variant === "object") {
    return variant.size_name || variant.sizeName || variant.size || "—";
  }
  return "—";
}

export default function StoreNamesNumbers() {
  const { store } = useTeamStoreContext();
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery<NameNumberRow[]>({
    queryKey: ["store-names-numbers", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_order_items")
        .select(`
          id,
          product_name_snapshot,
          store_display_name,
          personalization_name,
          personalization_number,
          quantity,
          variant_snapshot,
          team_store_orders!inner(
            id,
            order_number,
            store_id,
            status,
            fulfillment_status
          )
        `)
        .eq("team_store_orders.store_id", store.id)
        .or("personalization_name.neq.,personalization_number.neq.");

      if (error) throw error;

      return (data ?? [])
        .filter((r: any) => r.personalization_name || r.personalization_number)
        .map((r: any) => ({
          itemId: r.id,
          playerName: r.personalization_name ?? "",
          jerseyNumber: r.personalization_number ?? "",
          size: getSize(r.variant_snapshot),
          product: r.store_display_name || r.product_name_snapshot || "Unknown",
          quantity: r.quantity,
          orderNumber: r.team_store_orders.order_number,
          orderId: r.team_store_orders.id,
          fulfillmentStatus: r.team_store_orders.fulfillment_status,
        }));
    },
  });

  // Sort: Product → Jersey number (numeric) → Player name
  const sorted = useMemo(() => {
    const filtered = search
      ? rows.filter((r) => {
          const q = search.toLowerCase();
          return (
            r.playerName.toLowerCase().includes(q) ||
            r.jerseyNumber.includes(q) ||
            r.product.toLowerCase().includes(q) ||
            r.orderNumber.toLowerCase().includes(q)
          );
        })
      : rows;

    return [...filtered].sort((a, b) => {
      const prodCmp = a.product.localeCompare(b.product);
      if (prodCmp !== 0) return prodCmp;
      const numA = parseInt(a.jerseyNumber) || 9999;
      const numB = parseInt(b.jerseyNumber) || 9999;
      if (numA !== numB) return numA - numB;
      return a.playerName.localeCompare(b.playerName);
    });
  }, [rows, search]);

  // Group by product for visual separation
  const grouped = useMemo(() => {
    const map = new Map<string, NameNumberRow[]>();
    sorted.forEach((r) => {
      if (!map.has(r.product)) map.set(r.product, []);
      map.get(r.product)!.push(r);
    });
    return map;
  }, [sorted]);

  const exportCSV = () => {
    const headers = ["Player Name", "Jersey Number", "Size", "Product", "Qty", "Order ID"];
    const csvRows = sorted.map((r) => [
      r.playerName,
      r.jerseyNumber,
      r.size,
      r.product,
      r.quantity.toString(),
      r.orderNumber,
    ]);
    const csv = [headers, ...csvRows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `names-numbers-${store.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Names &amp; Numbers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Production-ready list of all personalized items for {store.name}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={sorted.length === 0}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: sorted.length.toString() },
          { label: "Products", value: grouped.size.toString() },
          { label: "Unique Orders", value: new Set(sorted.map((r) => r.orderId)).size.toString() },
          { label: "Pending", value: sorted.filter((r) => r.fulfillmentStatus === "unfulfilled").length.toString() },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, number, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {rows.length === 0
                  ? "No personalized items found for this store."
                  : "No items match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Jersey Number</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(grouped.entries()).map(([product, items], groupIdx) => (
                    <>
                      {/* Product group header */}
                      <TableRow key={`group-${product}`} className="bg-muted/40">
                        <TableCell colSpan={7} className="py-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {product}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {items.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {items.map((r) => (
                        <TableRow key={r.itemId}>
                          <TableCell className="text-sm font-medium">{r.playerName || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{r.jerseyNumber || "—"}</TableCell>
                          <TableCell className="text-sm">{r.size}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.product}</TableCell>
                          <TableCell className="text-right text-sm">{r.quantity}</TableCell>
                          <TableCell className="text-sm font-mono text-xs">{r.orderNumber}</TableCell>
                          <TableCell>
                            <Badge
                              variant={r.fulfillmentStatus === "fulfilled" ? "default" : "secondary"}
                              className="capitalize text-[10px]"
                            >
                              {r.fulfillmentStatus === "unfulfilled" ? "Pending" :
                               r.fulfillmentStatus === "fulfilled" ? "Completed" :
                               r.fulfillmentStatus.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
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
