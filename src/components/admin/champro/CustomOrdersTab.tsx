import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { ShipToFields } from "./ShipToFields";
import { placeCustomOrder, type CustomOrderPayload, type ChamproApiResponse } from "@/lib/champro-client";
import { format } from "date-fns";
import { toast } from "sonner";

interface CustomOrderItem {
  SKU: string;
  TeamName: string;
  PlayerName: string;
  PlayerNumber: string;
  Quantity: number;
}

const initialShipTo = {
  ShipToFirstName: "",
  ShipToLastName: "",
  Address: "",
  Address2: "",
  City: "",
  StateCode: "",
  ZIPCode: "",
  CountryCode: "US",
  Phone: "",
  IsResidential: false,
};

const emptyItem: CustomOrderItem = {
  SKU: "",
  TeamName: "",
  PlayerName: "",
  PlayerNumber: "",
  Quantity: 1,
};

export function CustomOrdersTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewJsonDialog, setViewJsonDialog] = useState<{ open: boolean; data: any }>({
    open: false,
    data: null,
  });
  const [po, setPo] = useState("");
  const [shipTo, setShipTo] = useState(initialShipTo);
  const [leadTime, setLeadTime] = useState("");
  const [proofFileURL, setProofFileURL] = useState("");
  const [teamColor, setTeamColor] = useState("");
  const [items, setItems] = useState<CustomOrderItem[]>([{ ...emptyItem }]);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    errors: string[];
    response?: ChamproApiResponse;
  } | null>(null);

  const queryClient = useQueryClient();

  // Fetch custom orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["champro-orders", "CUSTOM"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champro_orders")
        .select("*")
        .eq("order_type", "CUSTOM")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: async (payload: CustomOrderPayload) => {
      // Call Champro API
      const response = await placeCustomOrder(payload);

      // Determine status based on response
      const hasErrors =
        (response.RequestErrors && response.RequestErrors.length > 0) ||
        (response.OrderErrors && response.OrderErrors.length > 0) ||
        (response.SubOrderErrors && response.SubOrderErrors.length > 0);

      const status = hasErrors ? "error" : "submitted";
      const subOrderIds = response.SubOrders?.map((so) => so.SubOrderID) || [];

      // Save to database - cast payloads to JSON compatible types
      const { error: dbError } = await supabase.from("champro_orders").insert([{
        order_type: "CUSTOM" as const,
        po: payload.PO,
        request_payload: JSON.parse(JSON.stringify(payload)),
        response_payload: JSON.parse(JSON.stringify(response)),
        session_id: response.SessionID || null,
        sub_order_ids: subOrderIds,
        status,
      }]);

      if (dbError) throw dbError;

      return { response, hasErrors };
    },
    onSuccess: ({ response, hasErrors }) => {
      queryClient.invalidateQueries({ queryKey: ["champro-orders", "CUSTOM"] });

      const errors: string[] = [];
      if (response.RequestErrors) errors.push(...response.RequestErrors);
      if (response.OrderErrors) errors.push(...response.OrderErrors);
      if (response.SubOrderErrors) {
        response.SubOrderErrors.forEach((se) => {
          if (se.Errors) errors.push(...se.Errors);
        });
      }

      setSubmitResult({
        success: !hasErrors,
        errors,
        response,
      });

      if (!hasErrors) {
        toast.success("Custom order submitted successfully!");
        resetForm();
      }
    },
    onError: (error: Error) => {
      setSubmitResult({
        success: false,
        errors: [error.message],
      });
      toast.error("Failed to submit order: " + error.message);
    },
  });

  const resetForm = () => {
    setPo("");
    setShipTo(initialShipTo);
    setLeadTime("");
    setProofFileURL("");
    setTeamColor("");
    setItems([{ ...emptyItem }]);
    setSubmitResult(null);
  };

  const handleShipToChange = (field: string, value: string | boolean) => {
    setShipTo((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CustomOrderItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult(null);

    const payload: CustomOrderPayload = {
      PO: po,
      ...shipTo,
      LeadTime: leadTime,
      ProofFileURL: proofFileURL,
      TeamColor: teamColor,
      Items: items.map((item) => ({
        SKU: item.SKU,
        TeamName: item.TeamName,
        PlayerName: item.PlayerName,
        PlayerNumber: item.PlayerNumber,
        Quantity: item.Quantity,
      })),
    };

    submitOrderMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* New Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="btn-cta">
            <Plus className="w-4 h-4 mr-2" />
            New Custom Order
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Product Order</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Result Alert */}
            {submitResult && (
              <Alert variant={submitResult.success ? "default" : "destructive"}>
                {submitResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {submitResult.success ? "Order Submitted" : "Order Failed"}
                </AlertTitle>
                <AlertDescription>
                  {submitResult.success ? (
                    <>
                      Session ID: {submitResult.response?.SessionID}
                      <br />
                      SubOrder IDs:{" "}
                      {submitResult.response?.SubOrders?.map((so) => so.SubOrderID).join(", ")}
                    </>
                  ) : (
                    <ul className="list-disc pl-4 mt-2">
                      {submitResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Header Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="PO">Purchase Order (PO) *</Label>
                    <Input
                      id="PO"
                      value={po}
                      onChange={(e) => setPo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="LeadTime">Lead Time</Label>
                    <Input
                      id="LeadTime"
                      value={leadTime}
                      onChange={(e) => setLeadTime(e.target.value)}
                      placeholder="e.g., 10-12 weeks"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ProofFileURL">Proof File URL</Label>
                    <Input
                      id="ProofFileURL"
                      type="url"
                      value={proofFileURL}
                      onChange={(e) => setProofFileURL(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="TeamColor">Team Color</Label>
                    <Input
                      id="TeamColor"
                      value={teamColor}
                      onChange={(e) => setTeamColor(e.target.value)}
                      placeholder="e.g., Navy/Gold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ship-To */}
            <Card>
              <CardContent className="pt-6">
                <ShipToFields values={shipTo} onChange={handleShipToChange} />
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Order Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-6 gap-2 items-end border-b border-border pb-4 last:border-0"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">SKU *</Label>
                        <Input
                          value={item.SKU}
                          onChange={(e) => updateItem(index, "SKU", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Team Name</Label>
                        <Input
                          value={item.TeamName}
                          onChange={(e) => updateItem(index, "TeamName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Player Name</Label>
                        <Input
                          value={item.PlayerName}
                          onChange={(e) => updateItem(index, "PlayerName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Player Number</Label>
                        <Input
                          value={item.PlayerNumber}
                          onChange={(e) => updateItem(index, "PlayerNumber", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.Quantity}
                          onChange={(e) =>
                            updateItem(index, "Quantity", parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn-cta"
                disabled={submitOrderMutation.isPending}
              >
                {submitOrderMutation.isPending ? "Submitting..." : "Submit to Champro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Past Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Orders History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Cost Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const response = order.response_payload as ChamproApiResponse | null;
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="font-mono">{order.po}</TableCell>
                      <TableCell>
                        {response?.CostTotal
                          ? `$${response.CostTotal.toFixed(2)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "submitted"
                              ? "bg-green-100 text-green-800"
                              : order.status === "error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setViewJsonDialog({
                              open: true,
                              data: {
                                request: order.request_payload,
                                response: order.response_payload,
                              },
                            })
                          }
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View JSON
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No custom orders yet. Click "New Custom Order" to create one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* View JSON Dialog */}
      <Dialog
        open={viewJsonDialog.open}
        onOpenChange={(open) => setViewJsonDialog({ open, data: null })}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Request Payload</h4>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(viewJsonDialog.data?.request, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Response Payload</h4>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(viewJsonDialog.data?.response, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
