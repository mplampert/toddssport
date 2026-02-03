import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useCart, CartItem } from "@/hooks/useCart";
import { formatPrice } from "@/lib/champroPricing";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Trash2, 
  Minus, 
  Plus, 
  ArrowLeft, 
  Loader2,
  Package,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

function CartItemRow({ 
  item, 
  onRemove, 
  onUpdateQuantity 
}: { 
  item: CartItem; 
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}) {
  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    onUpdateQuantity(item.id, newQty);
  };

  const leadTimeLabels: Record<string, string> = {
    standard: "Standard (3-4 weeks)",
    express: "10-Day Rush",
    express_plus: "5-Day Rush",
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Product Info */}
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-secondary/50 rounded-lg flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {item.sport_title || item.sport_slug} Custom Uniform
            </h3>
            {item.team_name && (
              <p className="text-sm text-muted-foreground">Team: {item.team_name}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {leadTimeLabels[item.lead_time] || item.lead_time}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Design ID: {item.champro_session_id.slice(0, 12)}...
            </p>
          </div>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(-1)}
          disabled={item.quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center font-medium">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Price */}
      <div className="text-right min-w-[100px]">
        {item.unit_price ? (
          <>
            <p className="font-semibold text-foreground">
              {formatPrice(item.unit_price * item.quantity)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPrice(item.unit_price)} each
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Quote pending</p>
        )}
      </div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, loading, error, subtotal, removeItem, updateQuantity } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleRemove = async (id: string) => {
    const success = await removeItem(id);
    if (success) {
      toast.success("Item removed from cart");
    } else {
      toast.error("Failed to remove item");
    }
  };

  const handleUpdateQuantity = async (id: string, qty: number) => {
    const success = await updateQuantity(id, qty);
    if (!success) {
      toast.error("Failed to update quantity");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // For now, checkout first item (multi-item checkout can be added later)
    const item = items[0];
    
    if (!item.unit_price) {
      toast.error("Price not available. Please contact us for a quote.");
      return;
    }

    setCheckoutLoading(true);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("champro-checkout", {
        body: {
          champroSessionId: item.champro_session_id,
          sportSlug: item.sport_slug,
          category: item.category,
          productMaster: item.product_master,
          quantity: item.quantity,
          leadTime: item.lead_time,
          teamName: item.team_name,
        },
      });

      if (invokeError) {
        console.error("Checkout error:", invokeError);
        toast.error("Failed to start checkout. Please try again.");
        return;
      }

      if (data?.error) {
        console.error("Checkout API error:", data.error);
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error("Unable to create checkout session");
      }
    } catch (err) {
      console.error("Checkout exception:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/uniforms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-accent" />
              <h1 className="text-3xl font-bold text-foreground">Your Cart</h1>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-6">
                Design your custom uniforms and they'll appear here.
              </p>
              <Button asChild className="btn-cta">
                <Link to="/uniforms">Browse Uniforms</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Order Summary
                  </h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items ({items.length})</span>
                      <span>{subtotal > 0 ? formatPrice(subtotal) : "Quote pending"}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Subtotal</span>
                        <span className="text-accent">
                          {subtotal > 0 ? formatPrice(subtotal) : "TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    className="w-full btn-cta"
                    size="lg"
                    disabled={checkoutLoading || subtotal === 0}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating checkout...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Our team will review your designs and provide a final quote.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
