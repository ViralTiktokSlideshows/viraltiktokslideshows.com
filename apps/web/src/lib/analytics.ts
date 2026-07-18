// Google Analytics 4 (gtag.js). The measurement ID is a public identifier —
// safe to ship in the client bundle. The tag itself is loaded once in the root
// layout; this module is just the typed event helper the app calls.

export const GA_MEASUREMENT_ID = "G-7MT5DHY46D";

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Fires a GA4 event. No-ops safely on the server or before gtag has loaded
// (e.g. an ad-blocker stripped the script), so call sites never need to guard.
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
