import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Mail, Phone, MapPin, Calendar, DollarSign, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface ShipTo {
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  stateCode: string;
  zipCode: string;
  countryCode: string;
  phone?: string;
}

interface RequestPayload {
  stripe_session_id?: string;
  sport_slug?: string;
  product_master?: string;
  quantity?: string;
  lead_time?: string;
  lead_time_name?: string;
  team_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount_total?: number;
  payment_status?: string;
  ship_to?: ShipTo;
}

interface ManualOrder {
  id: string;
  po: string;
  status: string;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
  request_payload: RequestPayload;
  response_payload: Record<string, unknown> | null;
  session_id: string | null;
  champro_order_number: string | null;
}

export function ManualPOTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ["manual-champro-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champro_orders")
        .select("*")
        .eq("needs_manual_champro", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ManualOrder[];
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAsResolved = async (orderId: string) => {
    const { error } = await supabase
      .from("champro_orders")
      .update({ 
        needs_manual_champro: false,
        status: "manually_submitted"
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success("Order marked as resolved");
      refetch();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading orders...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive">
          Error loading orders: {error.message}
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            All Clear
          </CardTitle>
          <CardDescription>
            No orders require manual Champro submission
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            {orders.length} Order{orders.length !== 1 ? "s" : ""} Requiring Manual PO
          </CardTitle>
          <CardDescription className="text-orange-700">
            These orders were paid but failed to submit to Champro automatically. You must manually create POs for these.
          </CardDescription>
        </CardHeader>
      </Card>

      {orders.map((order) => {
        const payload = order.request_payload || {};
        const shipTo = payload.ship_to;
        const champroSessionId = order.session_id || payload.stripe_session_id?.split("_")[1];
        const errorResponse = order.response_payload as Record<string, unknown> | null;
        const errorMessage = errorResponse?.error || 
          (errorResponse?.Message as string) || 
          (errorResponse?.RequestErrors as Array<{ Response?: string }>)?.[0]?.Response ||
          "Unknown error";

        return (
          <Card key={order.id} className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    PO: {order.po}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(order.po, `po-${order.id}`)}
                    >
                      {copiedId === `po-${order.id}` ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                    <Badge variant="destructive">{order.status}</Badge>
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => markAsResolved(order.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Resolved
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Info */}
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm font-medium text-red-800">Error:</p>
                <p className="text-sm text-red-700">{String(errorMessage)}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Customer</h4>
                  <div className="bg-muted/50 rounded-md p-3 space-y-1">
                    <p className="font-medium">{payload.customer_name || payload.team_name || "N/A"}</p>
                    {order.customer_email && (
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline">
                          {order.customer_email}
                        </a>
                      </p>
                    )}
                    {payload.customer_phone && (
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {payload.customer_phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ship To */}
                {shipTo && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Ship To</h4>
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                        <span>
                          {shipTo.firstName} {shipTo.lastName}<br />
                          {shipTo.address}<br />
                          {shipTo.address2 && <>{shipTo.address2}<br /></>}
                          {shipTo.city}, {shipTo.stateCode} {shipTo.zipCode}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Order Details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Order Details</h4>
                  <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Sport:</span> {payload.sport_slug || "N/A"}</p>
                    <p><span className="text-muted-foreground">Lead Time:</span> {payload.lead_time_name || payload.lead_time || "N/A"}</p>
                    <p><span className="text-muted-foreground">Quantity:</span> {payload.quantity || "N/A"}</p>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Payment</h4>
                  <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                    <p className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium">
                        {payload.amount_total ? `$${(payload.amount_total / 100).toFixed(2)}` : "N/A"}
                      </span>
                    </p>
                    <p><span className="text-muted-foreground">Status:</span> {payload.payment_status || "N/A"}</p>
                  </div>
                </div>

                {/* Design Link */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Champro Session</h4>
                  <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
                    {order.session_id ? (
                      <>
                        <p className="font-mono text-xs break-all">{order.session_id}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          asChild
                        >
                          <a
                            href={`https://cb.champrosports.com/V2/Index?SessionId=${order.session_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Design
                          </a>
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No session ID</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
