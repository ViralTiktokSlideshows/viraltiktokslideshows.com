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

export async function createCheckoutSession(
  data: PendingSlideshow,
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

// Holds the slideshow a signed-out user was about to unlock while they go
// through /generate/checkout's sign-in step, so the checkout call can fire
// automatically the moment they land back with a session.
export function savePendingSlideshow(data: PendingSlideshow) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readPendingSlideshow(): PendingSlideshow | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSlideshow;
  } catch {
    return null;
  }
}

export function clearPendingSlideshow() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
