import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, MessageCircleWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
};

// Known Champro builder error messages
const CHAMPRO_ERROR_PATTERNS = [
  "Product has not been added to cart",
  "Try to do this some later",
  "contact with our Support Team",
  "session expired",
  "network error",
];

interface ChamproBuilderEmbedProps {
  sportSlug: string;
  sportTitle?: string;
  embedKey: string;
  height?: string;
  onCheckout?: (payload: {
    champroSessionId: string;
    sportSlug: string;
  }) => void;
  autoSubmitOrder?: boolean;
}

export function ChamproBuilderEmbed({
  sportSlug,
  sportTitle,
  embedKey,
  height = "800px",
  onCheckout,
  autoSubmitOrder = false,
}: ChamproBuilderEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const category = CHAMPRO_CATEGORIES[sportSlug];

  // Build the embed URL with required config parameters
  const getEmbedUrl = () => {
    const baseUrl = "https://cb.champrosports.com/V2/Index";
    if (category) {
      return `${baseUrl}/${category.id}?Name=${encodeURIComponent(category.name)}&lic=${embedKey}`;
    }
    return `${baseUrl}?lic=${embedKey}`;
  };

  // Report builder errors to Slack
  const reportBuilderError = useCallback(async (errorType: string, errorMessage: string) => {
    try {
      const { error } = await supabase.functions.invoke("champro-builder-error", {
        body: {
          errorType,
          errorMessage,
          sportSlug,
          sportTitle: sportTitle || category?.name,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });
      if (error) {
        console.error("Failed to report error:", error);
        return false;
      }
      console.log("Builder error reported to Slack");
      return true;
    } catch (err) {
      console.error("Failed to report builder error:", err);
      return false;
    }
  }, [sportSlug, sportTitle, category?.name]);

  // Handle manual error report from user
  const handleReportIssue = useCallback(async () => {
    if (!reportDescription.trim()) {
      toast.error("Please describe the issue you encountered");
      return;
    }
    
    setIsReporting(true);
    const success = await reportBuilderError("UserReported", reportDescription);
    setIsReporting(false);
    
    if (success) {
      toast.success("Issue reported! Our team will look into it.");
      setReportDialogOpen(false);
      setReportDescription("");
    } else {
      toast.error("Failed to report issue. Please try again or contact us directly.");
    }
  }, [reportDescription, reportBuilderError]);

  // Reload the iframe
  const handleRetry = useCallback(() => {
    setBuilderError(null);
    setIframeKey(prev => prev + 1);
    toast.info("Reloading the uniform designer...");
  }, []);

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

  // Champro builder calls window.cb_callback(action, id) on the parent page
  useEffect(() => {
    const handleChamproCallback = (cbAction: string, cbId: string) => {
      console.log("Champro cb_callback fired:", cbAction, cbId);

      if (cbAction === "ProcessDesign") {
        setSessionId(cbId);
        setBuilderError(null);
        console.log("Design saved with Session ID:", cbId);

        if (onCheckout) {
          onCheckout({
            champroSessionId: cbId,
            sportSlug,
          });
        }

        if (autoSubmitOrder) {
          submitToChampro(cbId);
        }
      }
    };

    // Register the global callback that Champro's iframe expects
    (window as any).cb_callback = handleChamproCallback;

    // Also listen for postMessage as a fallback
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.sender === "CustomBuilder") {
        const { action, message } = event.data;
        console.log("Champro postMessage event:", action, message);
        handleChamproCallback(action, message);
      }

      if (typeof event.data === "string") {
        const isKnownError = CHAMPRO_ERROR_PATTERNS.some(pattern =>
          event.data.toLowerCase().includes(pattern.toLowerCase())
        );
        if (isKnownError) {
          console.error("Champro builder error detected:", event.data);
          setBuilderError(event.data);
          reportBuilderError("IframeError", event.data);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      delete (window as any).cb_callback;
    };
  }, [onCheckout, sportSlug, autoSubmitOrder, reportBuilderError]);

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
      {/* Error banner with retry */}
      {builderError && (
        <div className="mb-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              The uniform designer encountered an error
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {builderError}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Our team has been notified. Please try again or contact us if the issue persists.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      <div
        className="relative w-full bg-background rounded-lg overflow-hidden border border-border"
        style={{ height }}
      >
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={getEmbedUrl()}
          title="Champro Custom Uniform Builder"
          className="absolute inset-0 w-full h-full"
          style={{ border: "none", overflow: "hidden" }}
          allow="fullscreen"
        />
      </div>

      {/* Report Issue Button - always visible */}
      <div className="mt-3 flex justify-end">
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <MessageCircleWarning className="w-4 h-4 mr-1.5" />
              Report an Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report a Problem</DialogTitle>
              <DialogDescription>
                Seeing an error in the designer? Let us know what happened and we'll look into it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Describe what happened (e.g., 'I clicked Process Design and got an error saying product could not be added to cart')"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReportIssue} disabled={isReporting}>
                  {isReporting ? "Sending..." : "Send Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isSubmitting && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20 animate-pulse">
          <p className="text-sm text-accent font-medium">
            Submitting your design to Champro...
          </p>
        </div>
      )}

      {sessionId && !isSubmitting && !builderError && (
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
