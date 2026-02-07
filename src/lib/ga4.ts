/**
 * GA4 event helper — thin wrapper around gtag().
 * Falls back silently when GA is not loaded (e.g. ad-blockers).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fire a GA4 custom event */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

/* ── Pre-built helpers ─────────────────────────────────── */

/** CTA button click (Get a Quote, Connect Today, etc.) */
export function trackCTAClick(label: string, location?: string) {
  trackEvent("cta_click", {
    cta_label: label,
    cta_location: location ?? "unknown",
  });
}

/** Quote form becomes visible (scrolled into view) */
export function trackFormView(formName: string) {
  trackEvent("form_view", { form_name: formName });
}

/** External link click */
export function trackOutboundClick(url: string, label?: string) {
  trackEvent("outbound_click", {
    link_url: url,
    link_label: label ?? "",
  });
}

/** Product viewed */
export function trackProductView(productName: string, brand?: string) {
  trackEvent("view_item", {
    item_name: productName,
    item_brand: brand ?? "",
  });
}

/** Catalog downloaded / viewed */
export function trackCatalogView(catalogName: string) {
  trackEvent("catalog_view", { catalog_name: catalogName });
}
