import { useState, useMemo } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

export default function ReportStoreOrders() {
  const { store } = useTeamStoreContext();
  const { orders, isLoading } = useStoreReportData(store.id);

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (paymentFilter === "paid" && o.payment_status !== "paid") return false;
      if (paymentFilter === "unpaid" && o.payment_status === "paid") return false;
      if (paymentFilter === "refunded" && o.payment_status !== "refunded") return false;
      if (fulfillmentFilter === "ship" && o.fulfillment_method !== "ship") return false;
      if (fulfillmentFilter === "pickup" && o.fulfillment_method !== "pickup") return false;
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, paymentFilter, fulfillmentFilter, dateFrom, dateTo]);

  const exportCSVHandler = () => {
    downloadCSV(
      `${store.name}-orders.csv`,
      ["Order ID", "Date", "Customer", "Email", "Total", "Payment", "Fulfillment", "Pickup Location", "Status"],
      filtered.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleDateString(),
        o.customer_name ?? "",
        o.customer_email ?? "",
        Number(o.total).toFixed(2),
        o.payment_status,
        o.fulfillment_method,
        o.pickup_location_id ?? "",
        o.fulfillment_status,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
        <Button variant="outline" size="sm" onClick={exportCSVHandler} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Fulfillment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="ship">Ship</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No orders match filters.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Pickup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].reverse().map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-sm">{o.order_number}</TableCell>
                      <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{o.customer_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.customer_email ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "refunded" ? "destructive" : "secondary"} className="capitalize text-[10px]">
                          {o.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">{o.fulfillment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{o.pickup_location_id ?? "—"}</TableCell>
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
