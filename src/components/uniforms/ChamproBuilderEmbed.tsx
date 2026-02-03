import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Champro Custom Builder category mappings
const CHAMPRO_CATEGORIES: Record<string, { id: number; name: string }> = {
  baseball: { id: 1154, name: "BASEBALL" },
  softball: { id: 1155, name: "FASTPITCH" },
  basketball: { id: 1159, name: "MEN'S BASKETBALL" },
  football: { id: 1158, name: "FOOTBALL" },
  hockey: { id: 1168, name: "HOCKEY" },
  volleyball: { id: 1161, name: "MEN'S VOLLEYBALL" },
  soccer: { id: 1164, name: "MEN'S SOCCER" },
  "track-field": { id: 1248, name: "MEN'S TRACK" },
  lacrosse: { id: 1251, name: "MEN'S LACROSSE" },
  wrestling: { id: 1172, name: "WRESTLING" },
};

interface ChamproBuilderEmbedProps {
  sportSlug: string;
  embedKey: string;
  height?: string;
  onCheckout?: (payload: {
    champroSessionId: string;
    sportSlug: string;
  }) => void;
  /** If true, automatically POST to /api/champro/order when design is saved */
  autoSubmitOrder?: boolean;
}

export function ChamproBuilderEmbed({
  sportSlug,
  embedKey,
  height = "800px",
  onCheckout,
  autoSubmitOrder = false,
}: ChamproBuilderEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const category = CHAMPRO_CATEGORIES[sportSlug];

  // Build the embed URL
  const getEmbedUrl = () => {
    const baseUrl = "https://cb.champrosports.com/V2/Index";
    if (category) {
      return `${baseUrl}/${category.id}?Name=${encodeURIComponent(category.name)}&lic=${embedKey}`;
    }
    // Fallback to all categories
    return `${baseUrl}?lic=${embedKey}`;
  };

  /**
   * Submit the design to Champro Order API via our backend
   */
  const submitToChampro = async (champroSessionId: string) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting design to Champro API:", { champroSessionId, sportSlug });
      
      const { data, error } = await supabase.functions.invoke("champro-order", {
        body: {
          champroSessionId,
          sportSlug,
        },
      });

      if (error) {
        console.error("Champro order error:", error);
        toast.error("Failed to submit order to Champro. Please contact us with your session ID.");
        return;
      }

      if (data?.success) {
        console.log("Champro order submitted successfully:", data);
        toast.success("Design submitted to Champro!", {
          description: `Order PO: ${data.orderPO}`,
        });
      } else {
        console.error("Champro order failed:", data);
        toast.error(data?.error || "Order submission failed. Please contact us.");
      }
    } catch (err) {
      console.error("Error submitting to Champro:", err);
      toast.error("Unable to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listen for messages from the Custom Builder iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.sender === "CustomBuilder") {
        const { action, message } = event.data;
        console.log("Champro Custom Builder event:", action, message);

        if (action === "ProcessDesign") {
          // Design was saved - message contains the Session ID
          setSessionId(message);
          console.log("Design saved with Session ID:", message);

          // Call the onCheckout callback if provided
          if (onCheckout) {
            onCheckout({
              champroSessionId: message,
              sportSlug,
            });
          }

          // Auto-submit to Champro API if enabled
          if (autoSubmitOrder) {
            submitToChampro(message);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onCheckout, sportSlug, autoSubmitOrder]);

  if (!embedKey) {
    return (
      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Uniform designer is not available at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="relative w-full bg-background rounded-lg overflow-hidden border border-border"
        style={{ height }}
      >
        <iframe
          ref={iframeRef}
          src={getEmbedUrl()}
          title="Champro Custom Uniform Builder"
          className="absolute inset-0 w-full h-full"
          style={{ border: "none", overflow: "hidden" }}
          allow="fullscreen"
        />
      </div>

      {isSubmitting && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20 animate-pulse">
          <p className="text-sm text-accent font-medium">
            Submitting your design to Champro...
          </p>
        </div>
      )}

      {sessionId && !isSubmitting && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-sm text-muted-foreground">
            Your design has been saved.{" "}
            <span className="font-medium text-foreground">
              Session ID: {sessionId}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Contact us with this ID to proceed with your order.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to check if a sport has Champro builder support
export function hasChamproBuilder(sportSlug: string): boolean {
  return sportSlug in CHAMPRO_CATEGORIES;
}
