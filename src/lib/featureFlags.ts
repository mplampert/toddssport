/**
 * Feature flags for controlling feature visibility.
 * Flip these to true when ready to launch.
 */
export const FEATURE_FLAGS = {
  /** When false, hides all Champro Custom Builder entry points from customers */
  ENABLE_CHAMPRO: true,
  /** When false, hides S&S blank apparel catalog from public */
  ENABLE_SS_CATALOG: false,
} as const;
