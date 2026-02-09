import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Minus, Plus, X } from "lucide-react";
import { useTeamStoreCart, type TeamStoreCartItem } from "@/hooks/useTeamStoreCart";
import { useState } from "react";

function CartLine({ item, onRemove, onUpdateQty }: {
  item: TeamStoreCartItem;
  onRemove: () => void;
  onUpdateQty: (q: number) => void;
}) {
  return (
    <div className="flex gap-3 py-3">
      {item.imageUrl && (
        <img src={item.imageUrl} alt="" className="w-14 h-14 object-contain rounded border bg-muted p-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.productName}</p>
        <p className="text-xs text-muted-foreground">{item.color} / {item.size}</p>
        {item.personalization?.name && (
          <p className="text-xs text-muted-foreground">Name: {item.personalization.name}</p>
        )}
        {item.personalization?.number && (
          <p className="text-xs text-muted-foreground">Number: {item.personalization.number}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <button onClick={() => onUpdateQty(item.quantity - 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
          <button onClick={() => onUpdateQty(item.quantity + 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">${(item.unitPrice * item.quantity).toFixed(2)}</p>
        {item.quantity > 1 && (
          <p className="text-[10px] text-muted-foreground">${item.unitPrice.toFixed(2)} ea</p>
        )}
        <button onClick={onRemove} className="mt-1 text-destructive hover:text-destructive/80">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface Props {
  storeId?: string;
}

export function TeamStoreCartDrawer({ storeId }: Props) {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearAll, itemsForStore } = useTeamStoreCart();
  const [open, setOpen] = useState(false);

  const displayItems = storeId ? itemsForStore(storeId) : items;
  const displayTotal = displayItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const displayCount = displayItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="fixed bottom-6 right-6 z-50 bg-accent text-accent-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <ShoppingCart className="w-6 h-6" />
          {displayCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1 bg-destructive text-destructive-foreground">
              {displayCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart ({displayCount})
          </SheetTitle>
        </SheetHeader>

        {displayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-border -mx-6 px-6">
              {displayItems.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onUpdateQty={(q) => updateQuantity(item.id, q)}
                />
              ))}
            </div>
            <Separator />
            <div className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-lg">${displayTotal.toFixed(2)}</span>
              </div>
              <Button className="w-full btn-cta" size="lg" disabled>
                Checkout (coming soon)
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Cart is saved locally for testing. Full checkout is under development.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
