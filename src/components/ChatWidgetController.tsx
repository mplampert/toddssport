import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hides the LeadConnector chat widget on admin pages
 * since admins don't need the customer service chat.
 */
export function ChatWidgetController() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");

    if (isAdmin) {
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
