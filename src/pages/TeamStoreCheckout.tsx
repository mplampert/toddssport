import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  Package,
  User,
  Truck,
} from "lucide-react";
import { useTeamStoreCart, type TeamStoreCartItem } from "@/hooks/useTeamStoreCart";
import { toast } from "sonner";

/* ─── Inner payment form (rendered inside <Elements>) ─── */
function PaymentForm({
  orderId,
  orderNumber,
  total,
  onSuccess,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setProcessing(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      // Mark order as paid in our DB (belt-and-suspenders; webhook also does this)
      await supabase
        .from("team_store_orders")
        .update({ status: "confirmed", payment_status: "paid" } as any)
        .eq("id", orderId);

      // Record payment ledger entry
      await supabase.from("team_store_payments").insert({
        order_id: orderId,
        type: "payment",
        method: "card",
        amount: total,
        provider: "stripe",
        provider_ref: result.paymentIntent.id,
        note: `Online checkout – PI ${result.paymentIntent.id}`,
      } as any);

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
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" className="w-full btn-cta" size="lg" disabled={!stripe || processing}>
        {processing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        Pay ${total.toFixed(2)}
      </Button>
    </form>
  );
}

/* ─── Main checkout page ─── */
export default function TeamStoreCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const { items, clearStore } = useTeamStoreCart();

  const storeItems = items.filter((i) => i.storeSlug === slug);
  const storeId = storeItems[0]?.storeId;
  const storeName = storeItems[0]?.storeName || "Store";
  const subtotal = storeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState("ship");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");

  // Checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [serverTotal, setServerTotal] = useState(subtotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  const stripePromise = getStripe();

  // Check for redirect back (payment_intent in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piClientSecret = params.get("payment_intent_client_secret");
    if (piClientSecret && stripePromise) {
      stripePromise.then((stripe) => {
        if (!stripe) return;
        stripe.retrievePaymentIntent(piClientSecret).then(({ paymentIntent }) => {
          if (paymentIntent?.status === "succeeded") {
            setPaid(true);
            if (storeId) clearStore(storeId);
          }
        });
      });
    }
  }, []);

  const validate = () => {
    if (!name.trim()) return "Name is required";
    if (!email.trim() || !email.includes("@")) return "Valid email is required";
    if (fulfillment === "ship") {
      if (!address1.trim()) return "Shipping address is required";
      if (!city.trim()) return "City is required";
      if (!state.trim()) return "State is required";
      if (!zip.trim()) return "ZIP code is required";
    }
    return null;
  };

  const handleStartCheckout = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("storefront-checkout", {
        body: {
          storeId,
          items: storeItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            brandName: i.brandName,
            color: i.color,
            colorCode: i.colorCode,
            size: i.size,
            sku: i.sku,
            quantity: i.quantity,
            basePrice: i.basePrice,
            decoUpcharge: i.decoUpcharge,
            persUpcharge: i.persUpcharge,
            imageUrl: i.imageUrl,
            personalization: i.personalization,
          })),
          customer: { name, email, phone },
          fulfillment: {
            method: fulfillment,
            address:
              fulfillment === "ship"
                ? { name, address1, address2, city, state, zip }
                : undefined,
          },
          customerNotes: notes || undefined,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setServerTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaid(true);
    if (storeId) clearStore(storeId);
    toast.success("Payment successful! Your order has been placed.");
  };

  // ── Order Confirmation ──
  if (paid) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6 py-16">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Order Confirmed!</h1>
            {orderNumber && (
              <p className="text-lg text-muted-foreground">
                Order <span className="font-mono font-semibold text-foreground">{orderNumber}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              Thank you for your order! You'll receive a confirmation email shortly.
            </p>
            <Button asChild className="btn-cta">
              <Link to={`/team-stores/${slug}`}>Back to Store</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Empty cart ──
  if (storeItems.length === 0 && !clientSecret) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button asChild variant="outline">
              <Link to={`/team-stores/${slug}`}>Continue Shopping</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link
              to={`/team-stores/${slug}/cart`}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Cart
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Checkout</span>
          </nav>

          <h1 className="text-2xl font-bold text-foreground mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" disabled={!!clientSecret} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" disabled={!!clientSecret} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" disabled={!!clientSecret} />
                  </div>
                </CardContent>
              </Card>

              {/* Fulfillment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5" />
                    Fulfillment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={fulfillment} onValueChange={setFulfillment} disabled={!!clientSecret}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ship" id="ship" />
                      <Label htmlFor="ship">Ship to me</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup">Pickup</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deliver" id="deliver" />
                      <Label htmlFor="deliver">Deliver to coach</Label>
                    </div>
                  </RadioGroup>

                  {fulfillment === "ship" && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label>Address *</Label>
                        <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" disabled={!!clientSecret} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Address 2</Label>
                        <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt, Suite, etc." disabled={!!clientSecret} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>City *</Label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!!clientSecret} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>State *</Label>
                          <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="OH" disabled={!!clientSecret} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ZIP *</Label>
                          <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="44101" disabled={!!clientSecret} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2">
                    <Label>Order Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." rows={2} disabled={!!clientSecret} />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!stripePromise ? (
                    <div className="p-4 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Stripe publishable key not configured.
                    </div>
                  ) : !clientSecret ? (
                    <div className="space-y-3">
                      {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                      )}
                      <Button
                        onClick={handleStartCheckout}
                        disabled={loading}
                        className="w-full btn-cta"
                        size="lg"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        Continue to Payment
                      </Button>
                    </div>
                  ) : (
                    <Elements
                      stripe={stripePromise}
                      options={{ clientSecret, appearance: { theme: "stripe" } }}
                    >
                      <PaymentForm
                        orderId={orderId}
                        orderNumber={orderNumber}
                        total={serverTotal}
                        onSuccess={handlePaymentSuccess}
                      />
                    </Elements>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storeItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-12 h-12 object-contain rounded border bg-muted p-0.5 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.color} / {item.size} × {item.quantity}
                        </p>
                        {item.personalization?.name && (
                          <p className="text-xs text-muted-foreground">Name: {item.personalization.name}</p>
                        )}
                        {item.personalization?.number && (
                          <p className="text-xs text-muted-foreground">#{item.personalization.number}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium shrink-0">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>$0.00</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${(clientSecret ? serverTotal : subtotal).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
