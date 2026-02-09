import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAddPayment } from "@/hooks/useStoreOrders";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  orderId: string;
  balanceDueDollars: number;
  customerEmail?: string;
  customerName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ orderId, balanceDueDollars, paymentIntentId, onSuccess }: {
  orderId: string;
  balanceDueDollars: number;
  paymentIntentId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const addPayment = useAddPayment(orderId);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setProcessing(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      // Record in our ledger
      await addPayment.mutateAsync({
        type: "payment",
        method: "card",
        amount: balanceDueDollars,
        provider: "stripe",
        provider_ref: paymentIntentId,
        note: `Card payment – PI ${paymentIntentId}`,
      } as any);
      toast.success("Card payment successful!");
      onSuccess();
    } else {
      setError(`Payment status: ${result.paymentIntent?.status}. Please try again.`);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!stripe || processing}>
          {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1" />}
          Pay ${balanceDueDollars.toFixed(2)}
        </Button>
      </div>
    </form>
  );
}

export function CardPaymentForm({ orderId, balanceDueDollars, customerEmail, customerName, onSuccess, onCancel }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stripePromise = getStripe();

  const startPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("order-payment-intent", {
        body: {
          action: "create_intent",
          orderId,
          amount: Math.round(balanceDueDollars * 100), // cents
          customerEmail,
          customerName,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (err: any) {
      setError(err.message || "Failed to start payment");
    } finally {
      setLoading(false);
    }
  };

  if (!stripePromise) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 text-sm text-muted-foreground">
        <AlertCircle className="w-4 h-4 inline mr-1" />
        Stripe publishable key not configured. Set <code className="bg-muted px-1">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable card payments.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Charge <span className="font-mono font-medium">${balanceDueDollars.toFixed(2)}</span> to customer's card.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={startPayment} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1" />}
            Start Card Payment
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <CheckoutForm
        orderId={orderId}
        balanceDueDollars={balanceDueDollars}
        paymentIntentId={paymentIntentId}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
