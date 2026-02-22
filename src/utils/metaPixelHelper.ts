// src/utils/metaPixelHelper.ts
// Meta Pixel Enhancement Utility for Todd's Sporting Goods
// Handles fbc/fbp cookie management and SPA navigation tracking

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

const PIXEL_ID = '373119482079759';
const COOKIE_EXPIRY_DAYS = 90;

// ── Cookie Helpers ──────────────────────────────────────────

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // Set on root domain so it works across subdomains
  const domain = window.location.hostname.replace(/^www\./, '');
  document.cookie = `${name}=${value};expires=${expires};path=/;domain=.${domain};SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ── FBC (Click ID) ─────────────────────────────────────────

function handleFbc(): void {
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');

  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie('_fbc', fbc, COOKIE_EXPIRY_DAYS);
  }
}

// ── FBP (Browser ID) ───────────────────────────────────────

function handleFbp(): void {
  if (!getCookie('_fbp')) {
    const random13 = Math.floor(1000000000000 + Math.random() * 9000000000000);
    const fbp = `fb.1.${Date.now()}.${random13}`;
    setCookie('_fbp', fbp, COOKIE_EXPIRY_DAYS);
  }
}

// ── Track Event ─────────────────────────────────────────────

export function trackMetaEvent(
  eventName: string,
  eventData?: Record<string, any>,
  userData?: Record<string, any>
): void {
  if (typeof window.fbq !== 'function') return;

  const fbc = getCookie('_fbc');
  const fbp = getCookie('_fbp');

  const enhancedUserData: Record<string, any> = { ...userData };
  if (fbc) enhancedUserData.fbc = fbc;
  if (fbp) enhancedUserData.fbp = fbp;

  if (Object.keys(enhancedUserData).length > 0) {
    window.fbq('track', eventName, eventData || {}, {
      eventID: `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    });
  } else {
    window.fbq('track', eventName, eventData || {});
  }
}

// ── SPA Navigation Tracking ─────────────────────────────────

function setupSpaTracking(): void {
  if (typeof window.fbq !== 'function') return;

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    setTimeout(() => {
      window.fbq('track', 'PageView');
    }, 100);
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    setTimeout(() => {
      window.fbq('track', 'PageView');
    }, 100);
  };

  window.addEventListener('popstate', () => {
    setTimeout(() => {
      window.fbq('track', 'PageView');
    }, 100);
  });
}

// ── Initialize ──────────────────────────────────────────────

export function initMetaPixelHelper(): void {
  handleFbc();
  handleFbp();
  setupSpaTracking();

  console.log('[Meta Pixel Helper] Initialized', {
    fbc: getCookie('_fbc'),
    fbp: getCookie('_fbp'),
    pixelId: PIXEL_ID,
  });
}

export default { initMetaPixelHelper, trackMetaEvent };
