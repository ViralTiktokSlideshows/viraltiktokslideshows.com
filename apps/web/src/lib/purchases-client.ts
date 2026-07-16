"use client";

import { env } from "@viraltiktokslideshows/env/web";

import type { SlideTextPosition } from "@/components/generate/slide-text-style";

import { authedFetch } from "./api-fetch";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PurchaseStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

// `textPosition` rides along on each slide from generation (openrouter.ts)
// through the Purchase row; the app preview draws the text there. Optional
// -- older purchases created before per-slide placement default to "top".
export type SlideData = {
  index: number;
  text: string;
  imageUrl?: string;
  textPosition?: SlideTextPosition;
};

export type PurchaseSummary = {
  id: string;
  idea: string;
  slides: SlideData[];
  status: PurchaseStatus;
  createdAt: string;
  saved?: boolean;
  format?: SlideFormat | null;
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

// Downloads every slide image, using the single most reliable file-download
// mechanism a browser has: a plain <a> pointing at a server URL that sends
// `Content-Disposition: attachment` (see the ?download=1 branch of
// /api/purchases/:id/slides/:index/image in apps/server/src/index.ts). The
// browser does the download itself.
//
// This deliberately REPLACES the previous fetch -> canvas-composite -> blob
// -> Web Share pipeline entirely. That pipeline had too many independent
// points of failure in the field: Web Share hangs indefinitely on desktop,
// canvas compositing / blob handling can throw in some webviews, and any of
// them dying left the user with either an endless spinner or a bare
// "couldn't download" error. An anchor pointed at an attachment URL cannot
// stall -- there's no promise to hang, no canvas, no blob, no share sheet.
// The trade-off: the downloaded files are the background images without the
// overlay text baked in (the text still shows in the in-app preview);
// re-baking text into the downloaded file needs the image bytes in JS,
// which is what was proving unreliable.
//
// A small gap between clicks keeps the browser from treating the batch as a
// popup/download flood; browsers may show a one-time "allow multiple
// downloads" prompt, which is expected and fine.
export async function saveSlidesToDevice(purchaseId: string, slides: SlideData[]): Promise<void> {
  const withImages = slides.filter((slide) => slide.imageUrl);
  if (withImages.length === 0) {
    throw new Error("No images are available for this slideshow yet.");
  }

  for (const slide of withImages) {
    const link = document.createElement("a");
    link.href = `${SERVER_URL}/api/purchases/${purchaseId}/slides/${slide.index}/image?download=1`;
    // Cross-origin downloads ignore this attribute and use the server's
    // Content-Disposition filename instead, but it's a correct same-origin
    // hint and harmless otherwise.
    link.download = `slide-${String(slide.index).padStart(2, "0")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Space the downloads out so the browser doesn't drop or block a burst.
    await new Promise((resolve) => setTimeout(resolve, 400));
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
