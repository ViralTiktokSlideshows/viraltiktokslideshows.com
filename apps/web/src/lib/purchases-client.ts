"use client";

import { env } from "@viraltiktokslideshows/env/web";

import type {
  SlideTextPosition,
  SlideTextStyle,
} from "@/components/generate/slide-text-style";

import { authedFetch } from "./api-fetch";
import { composeSlideImage } from "./compose-slide-image";

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

const SLIDE_FETCH_TIMEOUT_MS = 20_000;

function slideImageUrl(purchaseId: string, index: number, download = false): string {
  const base = `${SERVER_URL}/api/purchases/${purchaseId}/slides/${index}/image`;
  return download ? `${base}?download=1` : base;
}

async function fetchSlideImageBlob(purchaseId: string, index: number): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLIDE_FETCH_TIMEOUT_MS);
  try {
    const res = await authedFetch(slideImageUrl(purchaseId, index), { signal: controller.signal });
    if (!res.ok) throw new Error(`Slide ${index} image request failed (${res.status})`);
    return await res.blob();
  } finally {
    clearTimeout(timeout);
  }
}

// Triggers a browser download from a URL/blob via a temporary anchor. This
// is the reliable, can't-stall primitive: no Web Share (which hangs on
// desktop), no promise to await on. Same-origin blob URLs honor the
// download filename; the cross-origin server URL relies on the endpoint's
// Content-Disposition: attachment header (see ?download=1) instead.
function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Saves every slide image to the device. For each slide it tries to bake
// the styled text onto the background (see compose-slide-image.ts) and
// download that; if fetching or compositing that slide fails, it falls back
// to downloading the raw image straight from the server (Content-Disposition
// attachment), so a slide is never silently dropped. Processed one at a
// time with a small gap so the browser doesn't block the burst, and every
// step is timeout-guarded -- there is no Web Share and no unbounded await,
// so the download can't stall the way the old pipeline did.
export async function saveSlidesToDevice(purchaseId: string, slides: SlideData[]): Promise<void> {
  const withImages = slides.filter((slide) => slide.imageUrl);
  if (withImages.length === 0) {
    throw new Error("No images are available for this slideshow yet.");
  }

  let savedAny = false;
  for (const slide of withImages) {
    const filename = `slide-${String(slide.index).padStart(2, "0")}.png`;
    try {
      const backgroundBlob = await fetchSlideImageBlob(purchaseId, slide.index);
      const composed = await composeSlideImage(
        backgroundBlob,
        slide.text,
        slide.textPosition ?? "top",
        slide.textStyle ?? "boxed",
      );
      const url = URL.createObjectURL(composed);
      triggerDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      savedAny = true;
    } catch (error) {
      // Fetch or compositing failed for this slide -- fall back to the raw
      // server download so the user still gets the image (without baked
      // text). This uses the same endpoint with Content-Disposition, so the
      // browser saves it directly with no client-side steps to fail.
      console.error(`Compositing slide ${slide.index} failed; downloading the raw image`, error);
      triggerDownload(slideImageUrl(purchaseId, slide.index, true), filename);
      savedAny = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  if (!savedAny) {
    throw new Error("Could not download this slideshow. Please try again.");
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
