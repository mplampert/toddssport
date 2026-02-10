import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBatchDetail, useUpdateBatchStatus, BATCH_STATUSES } from "@/hooks/useFulfillmentBatches";
import { downloadCSV, itemDisplayName, itemSize, itemColor, itemDecorationType } from "@/hooks/useStoreReportData";
import type { StoreOrder, StoreOrderItem } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Download, Loader2, Package, ClipboardList, Users, Truck } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", ready: "Ready", in_production: "In Production", shipped: "Shipped", complete: "Complete",
};

export default function BatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { data: batch, isLoading: batchLoading } = useBatchDetail(batchId);
  const updateStatus = useUpdateBatchStatus();

  const orderIds = batch?.order_ids ?? [];

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["batch-orders", batchId],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, order_number, customer_name, customer_email, total, subtotal, tax_total, shipping_total, discount_total, status, payment_status, fulfillment_method, fulfillment_status, pickup_location_id, shipping_state, shipping_city, created_at, internal_notes")
        .in("id", orderIds);
      return (data ?? []) as StoreOrder[];
    },
    enabled: orderIds.length > 0,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["batch-items", batchId],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const all: StoreOrderItem[] = [];
      for (let i = 0; i < orderIds.length; i += 500) {
        const batch = orderIds.slice(i, i + 500);
        const { data } = await supabase
          .from("team_store_order_items")
          .select("id, order_id, product_name_snapshot, store_display_name, catalog_product_name, catalog_sku, quantity, unit_price, line_total, variant_snapshot, personalization_name, personalization_number, team_roster_player_id, decoration_snapshot, pricing_snapshot, team_store_product_id")
          .in("order_id", batch);
        if (data) all.push(...(data as StoreOrderItem[]));
      }
      return all;
    },
    enabled: orderIds.length > 0,
  });

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  // Work Orders: group by product + decoration
  const workOrders = useMemo(() => {
    const map = new Map<string, { product: string; decoration: string; sizes: Map<string, number> }>();
    items.forEach((item) => {
      const product = itemDisplayName(item);
      const decoration = itemDecorationType(item);
      const key = `${product}|||${decoration}`;
      if (!map.has(key)) map.set(key, { product, decoration, sizes: new Map() });
      const entry = map.get(key)!;
      const size = itemSize(item);
      entry.sizes.set(size, (entry.sizes.get(size) ?? 0) + Number(item.quantity));
    });
    return Array.from(map.values());
  }, [items]);

  // Packing: group by recipient
  const packingList = useMemo(() => {
    const map = new Map<string, { name: string; orderNumber: string; items: { product: string; size: string; qty: number }[] }>();
    items.forEach((item) => {
      const o = orderMap.get(item.order_id);
      const name = o?.customer_name ?? "Unknown";
      const orderNumber = o?.order_number ?? "—";
      const key = item.order_id;
      if (!map.has(key)) map.set(key, { name, orderNumber, items: [] });
      map.get(key)!.items.push({ product: itemDisplayName(item), size: itemSize(item), qty: Number(item.quantity) });
    });
    return Array.from(map.values());
  }, [items, orderMap]);

  // Supplier POs: group by SKU
  const supplierPOs = useMemo(() => {
    const map = new Map<string, { sku: string; product: string; color: string; sizes: Map<string, number> }>();
    items.forEach((item) => {
      const sku = item.catalog_sku ?? "NO-SKU";
      const product = itemDisplayName(item);
      const color = itemColor(item);
      const key = `${sku}|||${color}`;
      if (!map.has(key)) map.set(key, { sku, product, color, sizes: new Map() });
      const entry = map.get(key)!;
      const size = itemSize(item);
      entry.sizes.set(size, (entry.sizes.get(size) ?? 0) + Number(item.quantity));
    });
    return Array.from(map.values());
  }, [items]);

  const isLoading = batchLoading || ordersLoading || itemsLoading;

  if (batchLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!batch) {
    return <p className="text-center py-20 text-muted-foreground">Batch not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-2xl font-bold text-foreground">
            Batch {batch.id.slice(0, 8)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {batch.store_name} · Cutoff: {new Date(batch.cutoff_datetime).toLocaleString()} · {orderIds.length} orders
          </p>
        </div>
        <Select
          value={batch.status}
          onValueChange={(v) => updateStatus.mutate({ batchId: batch.id, status: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {BATCH_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders"><Package className="w-3.5 h-3.5 mr-1" />Orders</TabsTrigger>
          <TabsTrigger value="work-orders"><ClipboardList className="w-3.5 h-3.5 mr-1" />Work Orders</TabsTrigger>
          <TabsTrigger value="packing"><Users className="w-3.5 h-3.5 mr-1" />Packing</TabsTrigger>
          <TabsTrigger value="pos"><Truck className="w-3.5 h-3.5 mr-1" />Supplier POs</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              downloadCSV(`batch-${batch.id.slice(0, 8)}-orders.csv`,
                ["Order", "Customer", "Email", "Total", "Payment", "Fulfillment", "Date"],
                orders.map((o) => [o.order_number, o.customer_name ?? "", o.customer_email ?? "", Number(o.total).toFixed(2), o.payment_status, o.fulfillment_method, new Date(o.created_at).toLocaleDateString()])
              );
            }}>
              <Download className="w-3.5 h-3.5 mr-1" />CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell className="text-sm">{o.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">${Number(o.total).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="secondary">{o.payment_status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const rows: (string | number)[][] = [];
              workOrders.forEach((wo) => {
                wo.sizes.forEach((qty, size) => {
                  rows.push([wo.product, wo.decoration, size, qty]);
                });
              });
              downloadCSV(`batch-${batch.id.slice(0, 8)}-work-orders.csv`, ["Product", "Decoration", "Size", "Qty"], rows);
            }}>
              <Download className="w-3.5 h-3.5 mr-1" />CSV
            </Button>
          </div>
          {workOrders.map((wo, i) => (
            <Card key={i}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  {wo.product} — <span className="text-muted-foreground">{wo.decoration}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {Array.from(wo.sizes.entries()).map(([size, qty]) => (
                    <div key={size} className="text-center px-3 py-1.5 rounded bg-muted text-sm">
                      <span className="font-medium">{size}</span>
                      <span className="text-muted-foreground ml-1">×{qty}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Packing Tab */}
        <TabsContent value="packing" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const rows: (string | number)[][] = [];
              packingList.forEach((p) => {
                p.items.forEach((item) => {
                  rows.push([p.name, p.orderNumber, item.product, item.size, item.qty]);
                });
              });
              downloadCSV(`batch-${batch.id.slice(0, 8)}-packing.csv`, ["Recipient", "Order", "Product", "Size", "Qty"], rows);
            }}>
              <Download className="w-3.5 h-3.5 mr-1" />CSV
            </Button>
          </div>
          {packingList.map((p, i) => (
            <Card key={i}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  {p.name} <span className="text-muted-foreground font-normal">— Order {p.orderNumber}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.items.map((item, j) => (
                      <TableRow key={j}>
                        <TableCell className="text-sm">{item.product}</TableCell>
                        <TableCell className="text-sm">{item.size}</TableCell>
                        <TableCell className="text-sm">{item.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Supplier POs Tab */}
        <TabsContent value="pos" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const rows: (string | number)[][] = [];
              supplierPOs.forEach((po) => {
                po.sizes.forEach((qty, size) => {
                  rows.push([po.sku, po.product, po.color, size, qty]);
                });
              });
              downloadCSV(`batch-${batch.id.slice(0, 8)}-supplier-pos.csv`, ["SKU", "Product", "Color", "Size", "Qty"], rows);
            }}>
              <Download className="w-3.5 h-3.5 mr-1" />CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Sizes / Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPOs.map((po, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{po.sku}</TableCell>
                  <TableCell className="text-sm">{po.product}</TableCell>
                  <TableCell className="text-sm">{po.color}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(po.sizes.entries()).map(([size, qty]) => (
                        <span key={size} className="text-xs px-2 py-0.5 rounded bg-muted">
                          {size}: {qty}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
