import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Package, Trash2, Send, Loader2, Check, Minus, Plus } from "lucide-react";
import { useInquiryCart } from "@/hooks/useInquiryCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global open state
let openDrawerFn: (() => void) | null = null;
export function openInquiryDrawer() {
  openDrawerFn?.();
}

export function InquiryCartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, removeItem, updateQuantity, clearCart } = useInquiryCart();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [org, setOrg] = useState("");
  const [timeline, setTimeline] = useState("");
  const [decorationType, setDecorationType] = useState("");
  const [estimatedQty, setEstimatedQty] = useState("");
  const [notes, setNotes] = useState("");

  openDrawerFn = () => setOpen(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    if (items.length === 0) {
      toast.error("Your inquiry list is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const products = items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        brand: item.brand,
        style_code: item.sourceSku || "",
        color: item.color || "",
        qty: item.quantity,
        product_url: `${window.location.origin}${item.productUrl}`,
      }));

      // Build a text summary for GHL notes
      const productSummary = products
        .map((p, i) => `${i + 1}. ${p.brand} - ${p.name} (${p.style_code}) x${p.qty}${p.color ? ` [${p.color}]` : ""}\n   ${p.product_url}`)
        .join("\n");

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        organization: org.trim() || null,
        product_name: `Multi-product inquiry (${items.length} items)`,
        product_brand: products.map((p) => p.brand).filter(Boolean).join(", "),
        product_style_code: products.map((p) => p.style_code).filter(Boolean).join(", "),
        product_color: products.map((p) => p.color).filter(Boolean).join(", "),
        quantity_estimate: estimatedQty.trim() || products.map((p) => `${p.name}: ${p.qty}`).join(", "),
        decoration_type: decorationType.trim() || "",
        notes: `MULTI-PRODUCT INQUIRY (${items.length} items)\n\nTimeline: ${timeline || "Not specified"}\nDecoration: ${decorationType || "Not specified"}\n\nProducts:\n${productSummary}\n\nAdditional Notes: ${notes || "None"}`,
        // Include structured data
        products,
        inquiry_type: "multi_product",
      };

      // Save to product_inquiries table
      const { error: dbError } = await supabase.from("product_inquiries").insert({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        organization: payload.organization,
        product_name: payload.product_name,
        product_brand: payload.product_brand,
        product_style_code: payload.product_style_code,
        product_color: payload.product_color,
        quantity_estimate: payload.quantity_estimate,
        decoration_type: payload.decoration_type,
        notes: payload.notes,
      });

      if (dbError) throw dbError;

      // Fire webhook
      supabase.functions.invoke("notify-product-inquiry", {
        body: payload,
      }).catch((err) => console.warn("GHL webhook failed:", err));

      setSubmitted(true);
      toast.success("Inquiry submitted! We'll be in touch soon.");
      clearCart();
    } catch (err) {
      toast.error("Failed to submit inquiry. Please try again.");
      console.error("Multi-product inquiry error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setOrg("");
    setTimeline("");
    setDecorationType("");
    setEstimatedQty("");
    setNotes("");
    setSubmitted(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" />
            Inquiry List ({items.length})
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Inquiry Submitted!</h3>
            <p className="text-muted-foreground text-sm mb-4">
              We'll review your request and get back to you shortly.
            </p>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
              Close
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse the catalog and click "Add to Inquiry" to start building your list.
            </p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Browse Catalog
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Product List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="w-16 h-16 rounded-md bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                    {item.brand && (
                      <p className="text-[10px] text-accent uppercase tracking-wider">{item.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {item.sourceSku && (
                        <Badge variant="outline" className="text-[10px]">#{item.sourceSku}</Badge>
                      )}
                      {item.color && (
                        <Badge variant="secondary" className="text-[10px]">{item.color}</Badge>
                      )}
                    </div>
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            {/* Inquiry Form */}
            <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pb-4 pr-1">
              <p className="text-sm font-semibold text-foreground">Your Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inq-name" className="text-xs">Name *</Label>
                  <Input id="inq-name" value={name} onChange={(e) => setName(e.target.value)} required className="h-9" />
                </div>
                <div>
                  <Label htmlFor="inq-email" className="text-xs">Email *</Label>
                  <Input id="inq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inq-phone" className="text-xs">Phone</Label>
                  <Input id="inq-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label htmlFor="inq-org" className="text-xs">Organization / Team</Label>
                  <Input id="inq-org" value={org} onChange={(e) => setOrg(e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="inq-qty" className="text-xs">Est. Quantity</Label>
                  <Input id="inq-qty" placeholder="e.g. 50-100" value={estimatedQty} onChange={(e) => setEstimatedQty(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label htmlFor="inq-timeline" className="text-xs">Timeline</Label>
                  <Input id="inq-timeline" placeholder="e.g. March 15" value={timeline} onChange={(e) => setTimeline(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label htmlFor="inq-decoration" className="text-xs">Decoration</Label>
                  <Input id="inq-decoration" placeholder="e.g. Screen Print" value={decorationType} onChange={(e) => setDecorationType(e.target.value)} className="h-9" />
                </div>
              </div>

              <div>
                <Label htmlFor="inq-notes" className="text-xs">Notes</Label>
                <Textarea
                  id="inq-notes"
                  placeholder="Tell us about your project…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full btn-cta" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Inquiry ({items.length} product{items.length !== 1 ? "s" : ""})</>
                )}
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
