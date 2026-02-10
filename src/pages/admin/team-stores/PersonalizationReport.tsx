import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Download, Users, ChevronDown, ChevronRight } from "lucide-react";

interface PersonalizationItem {
  itemId: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  fulfillmentStatus: string;
  storeId: string;
  storeName: string;
  productName: string;
  personalizationName: string | null;
  personalizationNumber: string | null;
  personalizationType: string;
  quantity: number;
  variantSnapshot: any;
}

function getPersonalizationType(name: string | null, number: string | null): string {
  if (name && number) return "Name+Number";
  if (name) return "Name";
  if (number) return "Number";
  return "Other";
}

function getSize(variant: any): string {
  if (!variant) return "—";
  if (typeof variant === "object") {
    return variant.size_name || variant.sizeName || variant.size || "—";
  }
  return "—";
}

export default function PersonalizationReport() {
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery<PersonalizationItem[]>({
    queryKey: ["personalization-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_order_items")
        .select(`
          id,
          order_id,
          product_name_snapshot,
          store_display_name,
          personalization_name,
          personalization_number,
          quantity,
          variant_snapshot,
          team_store_orders!inner(
            order_number,
            store_id,
            created_at,
            status,
            fulfillment_status,
            team_stores!inner(name)
          )
        `)
        .or("personalization_name.neq.,personalization_number.neq.")
        .order("id");

      if (error) throw error;

      return (data ?? [])
        .filter((row: any) => row.personalization_name || row.personalization_number)
        .map((row: any) => {
          const order = row.team_store_orders;
          return {
            itemId: row.id,
            orderId: row.order_id,
            orderNumber: order.order_number,
            orderDate: order.created_at,
            orderStatus: order.status,
            fulfillmentStatus: order.fulfillment_status,
            storeId: order.store_id,
            storeName: order.team_stores.name,
            productName: row.store_display_name || row.product_name_snapshot || "Unknown",
            personalizationName: row.personalization_name,
            personalizationNumber: row.personalization_number,
            personalizationType: getPersonalizationType(row.personalization_name, row.personalization_number),
            quantity: row.quantity,
            variantSnapshot: row.variant_snapshot,
          };
        });
    },
  });

  // Unique stores for filter
  const uniqueStores = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => map.set(i.storeId, i.storeName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          i.storeName.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          (i.personalizationName ?? "").toLowerCase().includes(q) ||
          (i.personalizationNumber ?? "").toLowerCase().includes(q) ||
          i.orderNumber.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (storeFilter !== "all" && i.storeId !== storeFilter) return false;
      if (typeFilter !== "all" && i.personalizationType !== typeFilter) return false;
      if (statusFilter !== "all" && i.fulfillmentStatus !== statusFilter) return false;
      if (dateFrom && i.orderDate < dateFrom) return false;
      if (dateTo && i.orderDate > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [items, search, storeFilter, typeFilter, statusFilter, dateFrom, dateTo]);

  // Group by Store > Product
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, PersonalizationItem[]>>();
    filtered.forEach((i) => {
      if (!map.has(i.storeName)) map.set(i.storeName, new Map());
      const storeMap = map.get(i.storeName)!;
      if (!storeMap.has(i.productName)) storeMap.set(i.productName, []);
      storeMap.get(i.productName)!.push(i);
    });
    return map;
  }, [filtered]);

  const hasFilters = search || storeFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo;

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ["Store", "Product", "Order #", "Order Date", "Name", "Number", "Size", "Qty", "Status"];
    const rows = filtered.map((i) => [
      i.storeName,
      i.productName,
      i.orderNumber,
      new Date(i.orderDate).toLocaleDateString(),
      i.personalizationName ?? "",
      i.personalizationNumber ?? "",
      getSize(i.variantSnapshot),
      i.quantity.toString(),
      i.fulfillmentStatus,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personalization-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personalization Report</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Name &amp; number lists grouped by team and product for production.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Personalized Items", value: filtered.length.toString() },
          { label: "Unique Orders", value: new Set(filtered.map((i) => i.orderId)).size.toString() },
          { label: "Stores", value: new Set(filtered.map((i) => i.storeId)).size.toString() },
          { label: "Pending", value: filtered.filter((i) => i.fulfillmentStatus === "unfulfilled").length.toString() },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, number, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {uniqueStores.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Name">Name</SelectItem>
            <SelectItem value="Number">Number</SelectItem>
            <SelectItem value="Name+Number">Name+Number</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unfulfilled">Pending</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
            <SelectItem value="fulfilled">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(""); setStoreFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo("");
          }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Grouped Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "No personalized items found across any orders."
                  : "No items match the current filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(grouped.entries()).map(([storeName, productMap]) => (
                    <>
                      {/* Store Group Header */}
                      <TableRow
                        key={`store-${storeName}`}
                        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
                        onClick={() => toggleGroup(storeName)}
                      >
                        <TableCell colSpan={9} className="py-2">
                          <div className="flex items-center gap-2">
                            {collapsedGroups.has(storeName) ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-semibold text-sm text-foreground">{storeName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {Array.from(productMap.values()).reduce((s, arr) => s + arr.length, 0)} items
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>

                      {!collapsedGroups.has(storeName) &&
                        Array.from(productMap.entries()).map(([productName, rows]) => (
                          <>
                            {/* Product Sub-header */}
                            <TableRow key={`product-${storeName}-${productName}`} className="bg-muted/20">
                              <TableCell colSpan={9} className="py-1.5 pl-10">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {productName}
                                  <span className="ml-2 text-muted-foreground/60">({rows.length})</span>
                                </span>
                              </TableCell>
                            </TableRow>

                            {/* Item Rows */}
                            {rows.map((item) => (
                              <TableRow key={item.itemId}>
                                <TableCell></TableCell>
                                <TableCell className="text-sm font-medium">{item.orderNumber}</TableCell>
                                <TableCell className="text-sm">{new Date(item.orderDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-sm font-medium">{item.personalizationName ?? "—"}</TableCell>
                                <TableCell className="text-sm font-medium">{item.personalizationNumber ?? "—"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{item.personalizationType}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{getSize(item.variantSnapshot)}</TableCell>
                                <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={item.fulfillmentStatus === "fulfilled" ? "default" : "secondary"}
                                    className="capitalize text-[10px]"
                                  >
                                    {item.fulfillmentStatus === "unfulfilled" ? "Pending" :
                                     item.fulfillmentStatus === "in_production" ? "In Production" :
                                     item.fulfillmentStatus === "fulfilled" ? "Completed" :
                                     item.fulfillmentStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
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
