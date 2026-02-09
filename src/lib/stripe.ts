import { loadStripe } from "@stripe/stripe-js";

// Stripe publishable key — safe to store in frontend code.
// Set VITE_STRIPE_PUBLISHABLE_KEY in your .env or replace this placeholder.
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe() {
  if (!STRIPE_PK) {
    console.warn("VITE_STRIPE_PUBLISHABLE_KEY not set – card payments will not work.");
    return null;
  }
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PK);
  }
  return stripePromise;
}
