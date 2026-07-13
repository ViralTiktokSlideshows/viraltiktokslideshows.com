"use client";

import { env } from "@viraltiktokslideshows/env/web";

// Thin client for the checkout endpoints on apps/server, plus a small
// sessionStorage-backed handoff so a not-yet-signed-in user can bounce
// through /generate/checkout and come straight back to paying once they've
// signed in. Mirrors the shape of apps/web/src/lib/auth-client.ts so both
// can be reused the same way elsewhere in the app.

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;
const STORAGE_KEY = "vts:pending-slideshow";

export type PendingSlide = { index: number; text: string };

export type PendingSlideshow = {
  id: string;
  idea: string;
  formats: string[];
  vibes: string[];
  hook: string;
  slideCount: number;
  slides: PendingSlide[];
};

// A pending slideshow plus the idempotency key generated once for this
// unlock attempt. The same key travels with the slideshow everywhere it
// goes — sessionStorage, the magic-link callbackURL, back into
// createCheckoutSession — so retries (double-click, resuming after
// sign-in, a slow network retry) replay the same Purchase server-side
// instead of creating duplicates. See idempotencyKey handling in
// apps/server/src/index.ts's POST /api/checkout/create.
export type PendingCheckout = PendingSlideshow & { idempotencyKey: string };

export async function createCheckoutSession(
  data: PendingCheckout,
): Promise<{ checkoutUrl: string; purchaseId: string }> {
  const res = await fetch(`${SERVER_URL}/api/checkout/create`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Could not start checkout. Try again.");
  }

  return res.json();
}

// Holds the slideshow (+ idempotency key) a signed-out user was about to
// unlock while they go through /generate/checkout's sign-in step, so the
// checkout call can fire automatically the moment they land back with a
// session — on this device. Returns the tagged payload so the caller can
// also embed it in the magic-link callbackURL for the cross-device case
// (see encodePendingCheckout below).
export function savePendingSlideshow(data: PendingSlideshow): PendingCheckout {
  const withKey: PendingCheckout = { ...data, idempotencyKey: crypto.randomUUID() };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(withKey));
  }
  return withKey;
}

export function readPendingSlideshow(): PendingCheckout | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingCheckout;
  } catch {
    return null;
  }
}

// Re-persists a pending checkout that arrived via URL (see
// decodePendingCheckout) so a page refresh on this device keeps working
// without the query param.
export function savePendingCheckout(data: PendingCheckout) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearPendingSlideshow() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

// Base64url encode/decode for embedding a pending checkout inside a URL —
// used for the magic-link callbackURL specifically, since the email it's
// sent to can be opened on a completely different device/browser than the
// one that started the unlock flow, where sessionStorage is empty. Google
// sign-in doesn't need this: it redirects back to the same browser that
// started it by construction (the OAuth state lives in a cookie there).
export function encodePendingCheckout(data: PendingCheckout): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePendingCheckout(param: string): PendingCheckout | null {
  try {
    const base64 = param.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json) as PendingCheckout;
  } catch {
    return null;
  }
}
