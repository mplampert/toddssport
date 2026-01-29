import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, AlertCircle, Package, Truck } from "lucide-react";
import { getOrderStatus, type OrderStatusResult } from "@/lib/champro-client";
import { toast } from "sonner";

interface ShipmentLine {
  TrackingNumber?: string;
  ShippingCarrier?: string;
  ShippingService?: string;
  SKUs?: Array<{
    SKU: string;
    Quantity: number;
  }>;
}

export function OrderStatusTab() {
  const [subOrderId, setSubOrderId] = useState("");
  const [statusResult, setStatusResult] = useState<OrderStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const checkStatusMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const result = await getOrderStatus(orderId);

      // Check if this subOrderId exists in our database and update it
      const { data: existingOrders, error: fetchError } = await supabase
        .from("champro_orders")
        .select("*")
        .contains("sub_order_ids", [orderId]);

      if (fetchError) {
        console.error("Error fetching existing order:", fetchError);
      } else if (existingOrders && existingOrders.length > 0) {
        // Update the first matching order with the new status
        const orderToUpdate = existingOrders[0];
        const newStatus = result.Status?.toLowerCase() || orderToUpdate.status;

        await supabase
          .from("champro_orders")
          .update({
            status: newStatus,
            response_payload: JSON.parse(JSON.stringify(result)),
          })
          .eq("id", orderToUpdate.id);

        queryClient.invalidateQueries({ queryKey: ["champro-orders"] });
      }

      return result;
    },
    onSuccess: (result) => {
      setStatusResult(result);
      setError(null);
      toast.success("Order status retrieved successfully");
    },
    onError: (err: Error) => {
      setError(err.message);
      setStatusResult(null);
      toast.error("Failed to get order status: " + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subOrderId.trim()) {
      setError("Please enter a SubOrder ID");
      return;
    }
    setError(null);
    checkStatusMutation.mutate(subOrderId.trim());
  };

  return (
    <div className="space-y-6">
      {/* Status Check Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Check Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="SubOrderID">SubOrder ID (Order Number) *</Label>
                <Input
                  id="SubOrderID"
                  value={subOrderId}
                  onChange={(e) => setSubOrderId(e.target.value)}
                  placeholder="e.g., 12345678"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="btn-cta"
              disabled={checkStatusMutation.isPending}
            >
              {checkStatusMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Results */}
      {statusResult && (
        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-semibold font-mono">
                    {statusResult.OrderNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PO</p>
                  <p className="font-semibold font-mono">{statusResult.PO || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales ID</p>
                  <p className="font-semibold font-mono">
                    {statusResult.SalesID || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusResult.Status?.toLowerCase() === "shipped"
                        ? "bg-green-100 text-green-800"
                        : statusResult.Status?.toLowerCase() === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : statusResult.Status?.toLowerCase() === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusResult.Status || "Unknown"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipments */}
          {statusResult.Lines && statusResult.Lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {statusResult.Lines.map((line: ShipmentLine, index: number) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Tracking Number
                          </p>
                          <p className="font-mono font-semibold">
                            {line.TrackingNumber || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Carrier</p>
                          <p className="font-semibold">
                            {line.ShippingCarrier || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Service</p>
                          <p className="font-semibold">
                            {line.ShippingService || "—"}
                          </p>
                        </div>
                      </div>

                      {/* SKUs in this shipment */}
                      {line.SKUs && line.SKUs.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Items in Shipment</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Quantity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {line.SKUs.map((sku, skuIndex) => (
                                <TableRow key={skuIndex}>
                                  <TableCell className="font-mono">{sku.SKU}</TableCell>
                                  <TableCell>{sku.Quantity}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON for debugging */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                {JSON.stringify(statusResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
