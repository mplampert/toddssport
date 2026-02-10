import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Download, Package } from "lucide-react";

interface OrderItem {
  id: string;
  product_name_snapshot: string | null;
  store_display_name: string | null;
  catalog_sku: string | null;
  quantity: number;
  unit_price: number;
  variant_snapshot: any;
  team_store_orders: {
    store_id: string;
    created_at: string;
    status: string;
  };
}

export default function ReportProducts() {
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: items = [], isLoading } = useQuery<OrderItem[]>({
    queryKey: ["report-products-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_order_items")
        .select(`
          id,
          product_name_snapshot,
          store_display_name,
          catalog_sku,
          quantity,
          unit_price,
          variant_snapshot,
          team_store_orders!inner(store_id, created_at, status)
        `)
        .order("id");
      return (data ?? []) as any[];
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["report-products-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("team_stores").select("id, name").order("name");
      return data ?? [];
    },
  });

  const storeMap = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s: any) => m.set(s.id, s.name));
    return m;
  }, [stores]);

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; units: number; gross: number; brand: string }>();
    items.forEach((item: any) => {
      const order = item.team_store_orders;
      if (dateFrom && order.created_at < dateFrom) return;
      if (dateTo && order.created_at > dateTo + "T23:59:59") return;
      if (storeFilter !== "all" && order.store_id !== storeFilter) return;

      const name = item.store_display_name || item.product_name_snapshot || "Unknown";
      const sku = item.catalog_sku ?? "—";
      const brand = item.variant_snapshot?.brand_name ?? item.variant_snapshot?.brandName ?? "—";
      const key = `${name}|||${sku}`;
      const c = map.get(key) ?? { name, sku, units: 0, gross: 0, brand };
      c.units += Number(item.quantity ?? 0);
      c.gross += Number(item.unit_price ?? 0) * Number(item.quantity ?? 0);
      map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [items, dateFrom, dateTo, storeFilter]);

  const filtered = useMemo(() => {
    if (!search) return productStats;
    const q = search.toLowerCase();
    return productStats.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [productStats, search]);

  const hasFilters = search || storeFilter !== "all" || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ["Product", "SKU", "Vendor", "Units Sold", "Gross Sales"];
    const rows = filtered.map((p) => [p.name, p.sku, p.brand, p.units.toString(), p.gross.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search product, SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Store" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStoreFilter("all"); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No product data found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-sm font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-sm">{p.brand}</TableCell>
                      <TableCell className="text-right text-sm">{p.units}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${p.gross.toFixed(2)}</TableCell>
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
