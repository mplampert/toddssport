import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Tag,
  X,
} from "lucide-react";
import { useTeamStoreCart, type TeamStoreCartItem } from "@/hooks/useTeamStoreCart";
import { toast } from "sonner";

/* ─── Inner payment form ─── */
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
      // Record payment server-side to prevent client manipulation
      try {
        await supabase.functions.invoke("order-payment-intent", {
          body: {
            action: "record_payment",
            orderId,
            paymentIntentId: result.paymentIntent.id,
          },
        });
      } catch (err) {
        console.error("Failed to record payment server-side:", err);
      }

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

/* ─── Fulfillment option mapping ─── */
const FULFILLMENT_MAP: Record<string, { value: string; label: string }> = {
  ship_to_customer: { value: "ship", label: "Ship to me" },
  organization_pickup: { value: "pickup", label: "Organization Pickup" },
  deliver_to_organization: { value: "local_delivery", label: "Deliver to Organization" },
  local_pickup: { value: "local_pickup", label: "Local Pickup" },
};

/* ─── Main checkout page ─── */
export default function TeamStoreCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const { items, clearStore } = useTeamStoreCart();

  const storeItems = items.filter((i) => i.storeSlug === slug);
  const storeId = storeItems[0]?.storeId;
  const storeName = storeItems[0]?.storeName || "Store";
  const subtotal = storeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // ═══ Fetch store fulfillment config ═══
  const [storeFulfillmentMethods, setStoreFulfillmentMethods] = useState<{ value: string; label: string }[]>([]);
  const [pickupLocation, setPickupLocationInfo] = useState("");
  const [flatRateShipping, setFlatRateShipping] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      // Load store-level setting
      const { data: store } = await supabase
        .from("team_stores")
        .select("fulfillment_method, pickup_location, flat_rate_shipping")
        .eq("id", storeId)
        .single();

      let methods: string[] = [];
      let pickup = "";

      if (store?.fulfillment_method) {
        methods = (store.fulfillment_method as string).split(",").filter(Boolean);
        pickup = (store as any).pickup_location || "";
      }
      setFlatRateShipping(Number(store?.flat_rate_shipping) || 0);

      // Fallback to global defaults if store has none
      if (methods.length === 0) {
        const { data: settings } = await supabase
          .from("team_store_settings")
          .select("default_fulfillment_method, default_pickup_location")
          .limit(1)
          .single();
        if (settings?.default_fulfillment_method) {
          methods = (settings.default_fulfillment_method as string).split(",").filter(Boolean);
        }
        if (!pickup) pickup = (settings as any)?.default_pickup_location || "";
      }

      // Default fallback
      if (methods.length === 0) methods = ["ship_to_customer"];

      const mapped = methods
        .map((m) => FULFILLMENT_MAP[m])
        .filter(Boolean);

      setStoreFulfillmentMethods(mapped);
      setPickupLocationInfo(pickup);

      // Set default fulfillment to first available method
      if (mapped.length > 0) {
        setFulfillment(mapped[0].value);
      }
    })();
  }, [storeId]);

  // ═══ Billing fields ═══
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  // ═══ Recipient fields ═══
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientSmsOptIn, setRecipientSmsOptIn] = useState(false);

  // ═══ Fulfillment fields ═══
  const [fulfillment, setFulfillment] = useState("ship");
  // Ship
  const [shipName, setShipName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  // Pickup
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  // Local delivery
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const [notes, setNotes] = useState("");

  // ═══ Promo code ═══
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);

  // ═══ Checkout state ═══
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [serverTotal, setServerTotal] = useState(subtotal);
  const [serverDiscount, setServerDiscount] = useState(0);
  const [serverShipping, setServerShipping] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  const stripePromise = getStripe();

  // Check for redirect back
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

  const locked = !!clientSecret;

  // Client-side computed shipping
  const displayShipping = locked ? serverShipping : (fulfillment === "ship" ? flatRateShipping : 0);
  const displayDiscount = locked ? serverDiscount : promoDiscount;
  const displayTotal = locked ? serverTotal : Math.max(0, subtotal - displayDiscount + displayShipping);

  const validate = () => {
    if (!billingName.trim()) return "Billing name is required";
    if (!billingEmail.trim() || !billingEmail.includes("@")) return "Valid billing email is required";
    if (!recipientName.trim()) return "Recipient / player name is required";
    if (fulfillment === "ship") {
      if (!address1.trim()) return "Shipping address is required";
      if (!city.trim()) return "City is required";
      if (!state.trim()) return "State is required";
      if (!zip.trim()) return "ZIP code is required";
    }
    if (fulfillment === "pickup") {
      if (!pickupContactName.trim()) return "Pickup contact name is required";
      if (!pickupContactPhone.trim()) return "Pickup contact phone is required";
    }
    if (fulfillment === "local_delivery") {
      if (!deliveryAddress.trim()) return "Delivery address is required";
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
            sizeUpcharge: i.sizeUpcharge,
            decoUpcharge: i.decoUpcharge,
            persUpcharge: i.persUpcharge,
            imageUrl: i.imageUrl,
            personalization: i.personalization,
          })),
          billing: {
            name: billingName,
            email: billingEmail,
            phone: billingPhone || undefined,
          },
          recipient: {
            name: recipientName,
            email: recipientEmail || undefined,
            phone: recipientPhone || undefined,
            smsOptIn: recipientSmsOptIn,
          },
          fulfillment: {
            method: fulfillment,
            ...(fulfillment === "ship" ? {
              address: {
                name: shipName || billingName,
                address1,
                address2,
                city,
                state,
                zip,
                phone: shipPhone || billingPhone,
              },
            } : {}),
            ...(fulfillment === "pickup" ? {
              pickupContactName,
              pickupContactPhone,
            } : {}),
            ...(fulfillment === "local_delivery" ? {
              deliveryAddress,
              deliveryInstructions: deliveryInstructions || undefined,
            } : {}),
          },
          customerNotes: notes || undefined,
          promoCode: promoApplied ? promoCode.trim() : undefined,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setServerTotal(data.total);
      setServerDiscount(data.discountTotal || 0);
      setServerShipping(data.shippingTotal || 0);
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
            <Link to={`/team-stores/${slug}/cart`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Cart
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Checkout</span>
          </nav>

          <h1 className="text-2xl font-bold text-foreground mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Billing / Purchaser */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" /> Purchaser / Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name *</Label>
                      <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="John Smith" disabled={locked} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="john@example.com" disabled={locked} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} placeholder="(555) 123-4567" disabled={locked} />
                  </div>
                </CardContent>
              </Card>

              {/* Recipient / Player */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5" /> Player / Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Recipient Name *</Label>
                      <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Player name" disabled={locked} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Recipient Email</Label>
                      <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="Optional" disabled={locked} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Recipient Phone</Label>
                      <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Optional" disabled={locked} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        checked={recipientSmsOptIn}
                        onCheckedChange={(v) => setRecipientSmsOptIn(v === true)}
                        disabled={locked}
                      />
                      <Label className="text-sm font-normal">Opt-in to SMS updates</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fulfillment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5" /> Fulfillment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storeFulfillmentMethods.length > 1 ? (
                    <RadioGroup value={fulfillment} onValueChange={setFulfillment} disabled={locked}>
                      {storeFulfillmentMethods.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.value} id={opt.value} />
                          <Label htmlFor={opt.value}>{opt.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : storeFulfillmentMethods.length === 1 ? (
                    <p className="text-sm font-medium text-foreground">{storeFulfillmentMethods[0].label}</p>
                  ) : null}

                  {fulfillment === "local_pickup" && pickupLocation && (
                    <div className="p-3 rounded-md bg-muted/50 border border-border text-sm">
                      <p className="font-medium text-foreground mb-0.5">Pickup Location</p>
                      <p className="text-muted-foreground">{pickupLocation}</p>
                    </div>
                  )}

                  {fulfillment === "ship" && (
                    <div className="space-y-3 pt-2">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Ship To Name</Label>
                          <Input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder={billingName || "Same as billing"} disabled={locked} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Phone</Label>
                          <Input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder={billingPhone || "(555) 123-4567"} disabled={locked} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Address *</Label>
                        <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" disabled={locked} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Address 2</Label>
                        <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt, Suite, etc." disabled={locked} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>City *</Label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={locked} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>State *</Label>
                          <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="OH" disabled={locked} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ZIP *</Label>
                          <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="44101" disabled={locked} />
                        </div>
                      </div>
                    </div>
                  )}

                  {fulfillment === "pickup" && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label>Pickup Contact Name *</Label>
                        <Input value={pickupContactName} onChange={(e) => setPickupContactName(e.target.value)} placeholder="Who will pick up?" disabled={locked} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Pickup Contact Phone *</Label>
                        <Input value={pickupContactPhone} onChange={(e) => setPickupContactPhone(e.target.value)} placeholder="(555) 123-4567" disabled={locked} />
                      </div>
                    </div>
                  )}

                  {fulfillment === "local_delivery" && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label>Delivery Address *</Label>
                        <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Where should we deliver?" disabled={locked} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Delivery Instructions</Label>
                        <Textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} placeholder="Coach name, room number, etc." rows={2} disabled={locked} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2">
                    <Label>Order Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." rows={2} disabled={locked} />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5" /> Payment
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
                      <Button onClick={handleStartCheckout} disabled={loading} className="w-full btn-cta" size="lg">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        Continue to Payment
                      </Button>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                      <PaymentForm orderId={orderId} orderNumber={orderNumber} total={serverTotal} onSuccess={handlePaymentSuccess} />
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
                    <Package className="w-5 h-5" /> Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storeItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="w-12 h-12 object-contain rounded border bg-muted p-0.5 shrink-0" />
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

                  {/* Promo Code */}
                  {!locked && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Tag className="w-3.5 h-3.5" /> Promo Code
                      </Label>
                      {promoApplied ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-sm">
                            {promoCode.toUpperCase()}
                          </Badge>
                          <button
                            onClick={() => { setPromoApplied(false); setPromoCode(""); setPromoError(""); setPromoDiscount(0); }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={promoCode}
                            onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
                            placeholder="Enter code"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!promoCode.trim() || promoValidating}
                            onClick={async () => {
                              if (!billingEmail.trim()) {
                                setPromoError("Enter your billing email first");
                                return;
                              }
                              setPromoValidating(true);
                              setPromoError("");
                              try {
                                const { data: promo } = await supabase
                                  .from("team_store_promo_codes")
                                  .select("id, code, discount_type, discount_value, starts_at, ends_at, active, allowed_emails, allowed_email_domains, max_redemptions_total, max_redemptions_per_email")
                                  .eq("store_id", storeId)
                                  .ilike("code", promoCode.trim().toUpperCase())
                                  .eq("active", true)
                                  .maybeSingle();

                                if (!promo) {
                                  setPromoError("Invalid promo code");
                                  return;
                                }
                                const now = new Date();
                                if (promo.starts_at && new Date(promo.starts_at) > now) {
                                  setPromoError("Promo code is not yet active");
                                  return;
                                }
                                if (promo.ends_at && new Date(promo.ends_at) < now) {
                                  setPromoError("Promo code has expired");
                                  return;
                                }
                                // Calculate preview discount
                                let disc = 0;
                                if (promo.discount_type === "percent") {
                                  disc = Math.round(subtotal * (Number(promo.discount_value) / 100) * 100) / 100;
                                } else {
                                  disc = Math.min(Number(promo.discount_value), subtotal);
                                }
                                setPromoDiscount(disc);
                                setPromoApplied(true);
                              } catch {
                                setPromoError("Failed to validate promo code");
                              } finally {
                                setPromoValidating(false);
                              }
                            }}
                          >
                            {promoValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      )}
                      {promoError && (
                        <p className="text-xs text-destructive">{promoError}</p>
                      )}
                    </div>
                  )}

                  {promoApplied && displayDiscount > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        <Tag className="w-3 h-3 mr-1" />
                        {promoCode.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        -${displayDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {displayDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount</span>
                        <span>-${displayDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{displayShipping > 0 ? `$${displayShipping.toFixed(2)}` : "Free"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>$0.00</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${displayTotal.toFixed(2)}</span>
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
