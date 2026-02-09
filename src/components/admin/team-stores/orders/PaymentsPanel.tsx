import { useState } from "react";
import { useOrderPayments, useAddPayment, computePaymentStatus, type OrderPayment } from "@/hooks/useStoreOrders";
import { CardPaymentForm } from "./CardPaymentForm";
import { StripeRefundDialog } from "./StripeRefundDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, DollarSign, MinusCircle, PlusCircle, RotateCcw } from "lucide-react";

interface Props {
  orderId: string;
  orderTotal: number;
  isSample?: boolean;
  customerEmail?: string;
  customerName?: string;
}

export function PaymentsPanel({ orderId, orderTotal, isSample, customerEmail, customerName }: Props) {
  const { data: payments = [] } = useOrderPayments(orderId);
  const addPayment = useAddPayment(orderId);
  const { paidTotal, balanceDue, status } = computePaymentStatus(payments, orderTotal);

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"payment" | "refund">("payment");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [showStripeRefund, setShowStripeRefund] = useState(false);

  const hasCardPayments = payments.some((p) => p.provider === "stripe" && p.type === "payment");

  const openDialog = (type: "payment" | "refund") => {
    setDialogType(type);
    setAmount(type === "payment" ? Math.max(0, balanceDue).toFixed(2) : "");
    setMethod("cash");
    setNote("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    await addPayment.mutateAsync({
      type: dialogType,
      method,
      amount: amt,
      provider: "manual",
      note: note || null,
    } as any);
    setShowDialog(false);
  };

  const statusVariant = status === "paid" ? "default" : status === "partial" ? "secondary" : status === "refunded" ? "destructive" : "outline";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Payments</CardTitle>
          <Badge variant={statusVariant} className="text-sm">{status}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
          <div>
            <span className="text-muted-foreground">Order Total</span>
            <p className="font-mono font-medium">${Number(orderTotal).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Paid</span>
            <p className="font-mono font-medium text-green-600">${paidTotal.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Balance Due</span>
            <p className={`font-mono font-medium ${balanceDue > 0.01 ? "text-destructive" : ""}`}>${balanceDue.toFixed(2)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Payment ledger */}
        {payments.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant={p.type === "refund" ? "destructive" : "default"}>{p.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{p.method}</TableCell>
                  <TableCell className={`text-right font-mono text-sm ${p.type === "refund" ? "text-destructive" : "text-green-600"}`}>
                    {p.type === "refund" ? "-" : "+"}${Number(p.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={p.provider_ref || p.note || ""}>
                    {p.provider_ref || p.note || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Card Payment Element (embedded) */}
        {showCardPayment && !isSample && balanceDue > 0.01 && (
          <div className="border rounded-md p-4">
            <CardPaymentForm
              orderId={orderId}
              balanceDueDollars={balanceDue}
              customerEmail={customerEmail}
              customerName={customerName}
              onSuccess={() => setShowCardPayment(false)}
              onCancel={() => setShowCardPayment(false)}
            />
          </div>
        )}

        {/* Action buttons */}
        {!isSample && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openDialog("payment")} disabled={balanceDue <= 0.01}>
              <PlusCircle className="w-4 h-4 mr-1" /> Record Manual Payment
            </Button>
            {!showCardPayment && balanceDue > 0.01 && (
              <Button size="sm" variant="outline" onClick={() => setShowCardPayment(true)}>
                <CreditCard className="w-4 h-4 mr-1" /> Charge Card
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => openDialog("refund")} disabled={paidTotal <= 0}>
              <MinusCircle className="w-4 h-4 mr-1" /> Manual Refund
            </Button>
            {hasCardPayments && (
              <Button size="sm" variant="outline" onClick={() => setShowStripeRefund(true)}>
                <RotateCcw className="w-4 h-4 mr-1" /> Stripe Refund
              </Button>
            )}
          </div>
        )}
        {isSample && <p className="text-xs text-muted-foreground">Payments disabled for sample orders.</p>}
      </CardContent>

      {/* Manual payment/refund dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogType === "payment" ? "Record Manual Payment" : "Record Manual Refund"}</DialogTitle>
            <DialogDescription>
              {dialogType === "payment" ? `Balance due: $${balanceDue.toFixed(2)}` : `Total paid: $${paidTotal.toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card (external)</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={addPayment.isPending}>
              {dialogType === "payment" ? "Record Payment" : "Record Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Refund dialog */}
      <StripeRefundDialog
        open={showStripeRefund}
        onOpenChange={setShowStripeRefund}
        orderId={orderId}
      />
    </Card>
  );
}
