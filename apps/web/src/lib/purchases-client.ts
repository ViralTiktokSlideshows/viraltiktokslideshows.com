"use client";

import { env } from "@viraltiktokslideshows/env/web";

import type {
  SlideTextPosition,
  SlideTextStyle,
} from "@/components/generate/slide-text-style";

import { authedFetch } from "./api-fetch";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PurchaseStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

// textPosition + textStyle ride along on each slide from generation
// (openrouter.ts) so the download bakes the text in the same spot and look
// the preview shows. Optional -- older purchases default to top/boxed.
export type SlideData = {
  index: number;
  text: string;
  imageUrl?: string;
  textPosition?: SlideTextPosition;
  textStyle?: SlideTextStyle;
};

export type PurchaseSummary = {
  id: string;
  idea: string;
  slides: SlideData[];
  status: PurchaseStatus;
  createdAt: string;
  saved?: boolean;
  format?: SlideFormat | null;
  vibes?: string[];
};

export async function fetchPurchases(): Promise<PurchaseSummary[]> {
  const res = await authedFetch(`${SERVER_URL}/api/purchases`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.purchases) ? data.purchases : [];
}

// Stars/unstars a purchase for /dashboard/saved. Returns the new saved
// state on success so callers can reconcile optimistic UI if needed.
export async function toggleSaved(purchaseId: string, saved: boolean): Promise<boolean> {
  const res = await authedFetch(`${SERVER_URL}/api/purchases/${purchaseId}`, {
    method: "PATCH",
    body: JSON.stringify({ saved }),
  });
  if (!res.ok) throw new Error("Could not update this slideshow.");
  const data = await res.json();
  return Boolean(data?.saved);
}

// Deliberately NOT authedFetch -- /api/checkout/status is reachable by a
// signed-out visitor right after the Dodo redirect lands (session cookie
// might not have caught up yet), and the server itself only enforces
// ownership when a session *is* present. Redirecting to sign-in here would
// break that polling for the exact visitors it's meant to support.
export async function fetchPurchase(id: string): Promise<PurchaseSummary | null> {
  const res = await fetch(`${SERVER_URL}/api/checkout/status?purchase=${id}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;
  return { id, idea: data.idea ?? "", slides: data.slides ?? [], status: data.status, createdAt: "" };
}

function slideImageUrl(purchaseId: string, index: number, download = false): string {
  const base = `${SERVER_URL}/api/purchases/${purchaseId}/slides/${index}/image`;
  return download ? `${base}?download=1` : base;
}

// Triggers a browser download via a temporary anchor pointed straight at the
// server's ?download=1 endpoint. This is the reliable, can't-stall primitive:
// no client fetch, no Canvas, no blob, no Web Share (which hangs on desktop),
// no promise to await. The server bakes the slide TEXT onto the image and
// sends it with Content-Disposition: attachment (see the slides image route
// in apps/server/src/index.ts + lib/compose-slide.ts), so the browser saves a
// finished, captioned slide with zero client-side steps that can fail.
function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Saves every slide image to the device. Text is baked in server-side, so
// this just points an anchor at each slide's ?download=1 URL, one at a time
// with a small gap so the browser doesn't block the burst of downloads.
export async function saveSlidesToDevice(purchaseId: string, slides: SlideData[]): Promise<void> {
  const withImages = slides.filter((slide) => slide.imageUrl);
  if (withImages.length === 0) {
    throw new Error("No images are available for this slideshow yet.");
  }

  for (const slide of withImages) {
    const filename = `slide-${String(slide.index).padStart(2, "0")}.jpg`;
    triggerDownload(slideImageUrl(purchaseId, slide.index, true), filename);
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
