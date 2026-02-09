import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { useTeamStoreCart, type TeamStoreCartItem } from "@/hooks/useTeamStoreCart";

function CartLine({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: TeamStoreCartItem;
  onRemove: () => void;
  onUpdateQty: (q: number) => void;
}) {
  return (
    <div className="flex gap-4 py-4">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          className="w-20 h-20 object-contain rounded-lg border bg-muted p-1 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {item.brandName && `${item.brandName} · `}
          {item.color} / {item.size}
        </p>
        {item.personalization?.name && (
          <p className="text-sm text-muted-foreground">Name: {item.personalization.name}</p>
        )}
        {item.personalization?.number && (
          <p className="text-sm text-muted-foreground">Number: {item.personalization.number}</p>
        )}

        {/* Price breakdown */}
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <span>Base: ${item.basePrice.toFixed(2)}</span>
          {item.decoUpcharge > 0 && <span> · Deco: +${item.decoUpcharge.toFixed(2)}</span>}
          {item.persUpcharge > 0 && <span> · Pers: +${item.persUpcharge.toFixed(2)}</span>}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onUpdateQty(item.quantity - 1)}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
          <button
            onClick={() => onUpdateQty(item.quantity + 1)}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button onClick={onRemove} className="ml-2 text-destructive hover:text-destructive/80">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground">${(item.unitPrice * item.quantity).toFixed(2)}</p>
        {item.quantity > 1 && (
          <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} ea</p>
        )}
      </div>
    </div>
  );
}

export default function TeamStoreCart() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearStore, itemsForStore } = useTeamStoreCart();

  // Find storeId from cart items matching slug
  const storeItems = items.filter((i) => i.storeSlug === slug);
  const storeId = storeItems[0]?.storeId;
  const storeName = storeItems[0]?.storeName || "Store";
  const displayItems = storeId ? itemsForStore(storeId) : storeItems;
  const subtotal = displayItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itemCount = displayItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link
              to={`/team-stores/${slug}`}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {storeName}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cart</span>
          </nav>

          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
            <ShoppingCart className="w-6 h-6" />
            Your Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
          </h1>

          {displayItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button asChild variant="outline">
                <Link to={`/team-stores/${slug}`}>Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {displayItems.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onUpdateQty={(q) => updateQuantity(item.id, q)}
                  />
                ))}
              </div>

              <Separator className="my-6" />

              {/* Summary */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-muted-foreground">$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" asChild className="flex-1">
                  <Link to={`/team-stores/${slug}`}>Continue Shopping</Link>
                </Button>
                <Button
                  className="flex-1 btn-cta"
                  size="lg"
                  onClick={() => navigate(`/team-stores/${slug}/checkout`)}
                >
                  Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <button
                onClick={() => storeId && clearStore(storeId)}
                className="mt-4 text-sm text-destructive hover:underline w-full text-center"
              >
                Clear Cart
              </button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
