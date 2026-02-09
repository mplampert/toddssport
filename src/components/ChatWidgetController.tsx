import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hides the LeadConnector chat widget on team-store storefront pages
 * to avoid overlapping with the cart FAB and add-to-cart buttons.
 * On all other pages the widget is visible in its default bottom-right position.
 */
export function ChatWidgetController() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Match storefront routes: /team-stores/:slug, /team-stores/:slug/product/..., etc.
    // But NOT /team-stores (marketing page) or /team-stores/browse (listing)
    const isStorefront =
      /^\/team-stores\/[^/]+/.test(pathname) &&
      pathname !== "/team-stores/browse";

    // Also hide on preview routes
    const isPreview = pathname.startsWith("/preview/team-store/");

    if (isStorefront || isPreview) {
      document.body.classList.add("hide-chat-widget");
    } else {
      document.body.classList.remove("hide-chat-widget");
    }

    return () => {
      document.body.classList.remove("hide-chat-widget");
    };
  }, [pathname]);

  return null;
}
