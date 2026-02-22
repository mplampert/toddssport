/* ─── Meta Pixel Helper ─── */

// Extend Window for fbq
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const META_PIXEL_ID = "373119482079759";
const COOKIE_DAYS = 90;

/* ── Cookie helpers ── */

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // Set on root domain
  const hostParts = window.location.hostname.split(".");
  const domain =
    hostParts.length > 2
      ? "." + hostParts.slice(-2).join(".")
      : "." + window.location.hostname;
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;domain=${domain};SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/* ── FBC / FBP handling ── */

function handleFbc() {
  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get("fbclid");
  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", fbc, COOKIE_DAYS);
  }
}

function handleFbp() {
  if (!getCookie("_fbp")) {
    const random = Math.floor(1e12 + Math.random() * 9e12); // 13-digit number
    const fbp = `fb.1.${Date.now()}.${random}`;
    setCookie("_fbp", fbp, COOKIE_DAYS);
  }
}

/* ── Track event ── */

export function trackMetaEvent(
  eventName: string,
  eventData?: Record<string, unknown>,
  userData?: { em?: string; ph?: string; [key: string]: unknown }
) {
  if (!window.fbq) return;

  const fbc = getCookie("_fbc");
  const fbp = getCookie("_fbp");

  // Set advanced matching data if available
  const advancedMatching: Record<string, unknown> = { ...userData };
  if (fbc) advancedMatching.fbc = fbc;
  if (fbp) advancedMatching.fbp = fbp;

  if (Object.keys(advancedMatching).length > 0) {
    window.fbq("init", META_PIXEL_ID, advancedMatching);
  }

  window.fbq("track", eventName, eventData ?? {});
}

/* ── SPA navigation patching ── */

function patchHistory() {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (...args) {
    originalPush.apply(this, args);
    if (window.fbq) window.fbq("track", "PageView");
  };

  history.replaceState = function (...args) {
    originalReplace.apply(this, args);
    if (window.fbq) window.fbq("track", "PageView");
  };

  window.addEventListener("popstate", () => {
    if (window.fbq) window.fbq("track", "PageView");
  });
}

/* ── Init (call once) ── */

export function initMetaPixelHelper() {
  handleFbc();
  handleFbp();
  patchHistory();
}
