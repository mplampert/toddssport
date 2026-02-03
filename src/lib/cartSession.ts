// Simple cart session management using localStorage
const CART_SESSION_KEY = "todds_cart_session";

export function getCartSessionId(): string {
  let sessionId = localStorage.getItem(CART_SESSION_KEY);
  
  if (!sessionId) {
    // Generate a unique session ID
    sessionId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(CART_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

export function clearCartSession(): void {
  localStorage.removeItem(CART_SESSION_KEY);
}
