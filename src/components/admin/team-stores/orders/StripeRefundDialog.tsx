import { useState, useMemo } from "react";
import { useOrderPayments } from "@/hooks/useStoreOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export function StripeRefundDialog({ open, onOpenChange, orderId }: Props) {
  const qc = useQueryClient();
  const { data: payments = [] } = useOrderPayments(orderId);

  // Find card payments eligible for refund
  const cardPayments = useMemo(
    () => payments.filter((p) => p.provider === "stripe" && p.type === "payment" && p.provider_ref),
    [payments]
  );

  const [selectedPiId, setSelectedPiId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const selectedPayment = cardPayments.find((p) => p.provider_ref === selectedPiId);
  const maxRefundable = selectedPayment ? Number(selectedPayment.amount) : 0;

  const handleRefund = async () => {
    const amt = parseFloat(amount);
    if (!selectedPiId || !amt || amt <= 0) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("order-payment-intent", {
        body: {
          action: "refund",
          paymentIntentId: selectedPiId,
          amount: Math.round(amt * 100),
          orderId,
          note: note || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Refunded $${amt.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["team-store-order-payments", orderId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Refund failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stripe Refund</DialogTitle>
          <DialogDescription>Choose a card payment to refund. Partial refunds are supported.</DialogDescription>
        </DialogHeader>
        {cardPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No Stripe card payments found on this order to refund.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Payment to Refund</Label>
              <Select
                value={selectedPiId}
                onValueChange={(v) => {
                  setSelectedPiId(v);
                  const p = cardPayments.find((cp) => cp.provider_ref === v);
                  if (p) setAmount(Number(p.amount).toFixed(2));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select payment…" /></SelectTrigger>
                <SelectContent>
                  {cardPayments.map((p) => (
                    <SelectItem key={p.id} value={p.provider_ref!}>
                      ${Number(p.amount).toFixed(2)} – {new Date(p.created_at).toLocaleDateString()} ({p.provider_ref})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Refund Amount (max ${maxRefundable.toFixed(2)})</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {cardPayments.length > 0 && (
            <Button variant="destructive" onClick={handleRefund} disabled={processing || !selectedPiId || !amount}>
              {processing && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Issue Refund
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
