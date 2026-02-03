import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Champro Custom Builder category mappings - all 26 categories
const CHAMPRO_CATEGORIES: Record<string, { id: number; name: string }> = {
  // Core Sports
  baseball: { id: 1154, name: "BASEBALL" },
  softball: { id: 1155, name: "FASTPITCH" },
  football: { id: 1158, name: "FOOTBALL" },
  basketball: { id: 1159, name: "MEN'S BASKETBALL" },
  "womens-basketball": { id: 1160, name: "WOMEN'S BASKETBALL" },
  volleyball: { id: 1161, name: "MEN'S VOLLEYBALL" },
  "womens-volleyball": { id: 1162, name: "WOMEN'S VOLLEYBALL" },
  soccer: { id: 1164, name: "MEN'S SOCCER" },
  "womens-soccer": { id: 1165, name: "WOMEN'S SOCCER" },
  hockey: { id: 1168, name: "HOCKEY" },
  wrestling: { id: 1172, name: "WRESTLING" },
  "track-field": { id: 1248, name: "MEN'S TRACK" },
  "womens-track": { id: 1249, name: "WOMEN'S TRACK" },
  lacrosse: { id: 1251, name: "MEN'S LACROSSE" },
  "womens-lacrosse": { id: 1252, name: "WOMEN'S LACROSSE" },
  slowpitch: { id: 1209, name: "SLOWPITCH" },
  "7v7": { id: 1171, name: "7V7" },
  
  // Accessories & Apparel
  caps: { id: 1156, name: "CAPS" },
  "splash-shirts": { id: 1157, name: "SPLASH SHIRTS" },
  "mens-sportswear": { id: 1217, name: "MEN'S SPORTSWEAR" },
  "womens-sportswear": { id: 1219, name: "WOMEN'S SPORTSWEAR" },
  
  // Special Programs & Collections
  realtree: { id: 1542, name: "REALTREE®" },
  "juice-5-day": { id: 1566, name: "JUICE 5-DAY PROGRAM" },
  "legacy-collection": { id: 1567, name: "LEGACY COLLECTION" },
  "slam-dunk-5-day": { id: 1590, name: "SLAM DUNK 5-DAY PROGRAM" },
  
  // Blankets - placeholder until category ID is confirmed
  // blankets: { id: TBD, name: "BLANKETS" },
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
