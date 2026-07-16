"use client";

import { env } from "@viraltiktokslideshows/env/web";

import type { SlideTextPosition } from "@/components/generate/slide-text-style";

import { authedFetch } from "./api-fetch";
import { composeSlideImage } from "./compose-slide-image";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PurchaseStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

// `textPosition` rides along on each slide from generation (openrouter.ts)
// through the Purchase row to here, so the download bakes the text in the
// same spot the preview shows it. Optional -- older purchases created
// before per-slide placement existed just default to "top".
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

// A stalled fetch has no default timeout in the browser -- without this,
// a slow/hung R2 or Pexels response behind our own image proxy leaves the
// whole download spinning forever with nothing to show for it (see the
// comment on IMAGE_LOAD_TIMEOUT_MS in compose-slide-image.ts for the other
// half of this -- image decode/font-load can hang too).
const SLIDE_FETCH_TIMEOUT_MS = 20_000;

async function fetchSlideImageBlob(purchaseId: string, index: number): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SLIDE_FETCH_TIMEOUT_MS);
  try {
    const res = await authedFetch(
      `${SERVER_URL}/api/purchases/${purchaseId}/slides/${index}/image`,
      { signal: controller.signal },
    );
    if (!res.ok) throw new Error(`Slide ${index} image request failed (${res.status})`);
    return await res.blob();
  } finally {
    clearTimeout(timeout);
  }
}

// Replaces the old zip download entirely, not just its implementation --
// a .zip is a real barrier for the non-technical creators this app is
// for (unzipping isn't an obvious phone gesture, especially on iOS, and
// even setting that aside, blob-URL <a download> links are notoriously
// unreliable specifically on iOS Safari). Fetches each slide's bare
// background image through our own API (same-origin, so no cross-origin
// R2 fetch/CORS surprises), bakes the actual slide text onto it
// client-side at full resolution (see compose-slide-image.ts) so the
// saved file matches what's shown in the app instead of a textless
// background photo, then hands the finished images to the native share
// sheet -- "Save Images"/"Save to Photos" in one tap, the same gesture
// people already use to save photos out of Messages or Instagram.
//
// The Web Share sheet ("Save to Photos") is the right UX on a phone, but on
// desktop it's a trap: several desktop browsers report navigator.canShare
// ({files}) === true, yet navigator.share() then hangs forever (the OS
// share sheet never actually opens for a plain image file) -- an await that
// never settles, which is exactly the "all slides fetched 200 then the
// spinner just spins" behavior seen in prod. So we only attempt the share
// sheet when this is actually a touch/mobile device, and fall through to
// direct per-file downloads everywhere else.
function isLikelyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports a desktop UA but has touch; treat multi-touch as mobile.
  return (navigator.maxTouchPoints ?? 0) > 1 && /Mac/i.test(navigator.userAgent);
}

// Prepares one slide's downloadable File. Two independent things can go
// wrong and neither should lose the slide silently:
//   1. The server image proxy fetch fails (dead/expired source, network) --
//      that slide genuinely has no image, so it's dropped (and logged).
//   2. The fetch succeeds but the canvas text-compositing step throws
//      (rare, but e.g. an oversized canvas hitting a memory limit, or a
//      quirky mobile webview) -- in that case we still hand back the raw
//      background image so the person gets *something* usable, just without
//      the text baked on, rather than the whole download failing.
async function prepareSlideFile(purchaseId: string, slide: SlideData): Promise<File> {
  const backgroundBlob = await fetchSlideImageBlob(purchaseId, slide.index);
  const name = `slide-${String(slide.index).padStart(2, "0")}`;
  try {
    // Bake the text where this specific slide wants it (top/center/bottom),
    // matching the preview -- not a fixed spot for the whole deck.
    const composedBlob = await composeSlideImage(
      backgroundBlob,
      slide.text,
      slide.textPosition ?? "top",
    );
    return new File([composedBlob], `${name}.png`, { type: "image/png" });
  } catch (composeError) {
    console.error(`Compositing slide ${slide.index} failed; saving the raw image instead`, composeError);
    const type = backgroundBlob.type || "image/png";
    const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "png";
    return new File([backgroundBlob], `${name}.${ext}`, { type });
  }
}

// Runs every slide concurrently (Promise.allSettled), not one at a time --
// the sequential version blocked the entire download on whichever single
// slide was slowest, and with no timeout anywhere in that chain a stuck
// fetch or a stuck image decode meant the "downloading" spinner never
// resolved and nothing after that slide ever ran. Every step has a timeout
// (fetch, image decode, font-load), one slide failing never sinks the rest,
// and the whole thing always settles -- no path can leave the spinner
// spinning forever.
export async function saveSlidesToDevice(purchaseId: string, slides: SlideData[]): Promise<void> {
  const withImages = slides.filter((slide) => slide.imageUrl);
  if (withImages.length === 0) {
    throw new Error("No images are available for this slideshow yet.");
  }

  const results = await Promise.allSettled(
    withImages.map((slide) => prepareSlideFile(purchaseId, slide)),
  );

  const files: File[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      files.push(result.value);
    } else {
      console.error("Failed to prepare a slide for download", result.reason);
    }
  }

  if (files.length === 0) {
    throw new Error("Could not download this slideshow. Please try again.");
  }

  // Share sheet ("Save to Photos") only on real mobile devices -- on desktop
  // navigator.share({files}) can report as supported and then hang forever
  // (the OS sheet never opens for plain image files), which is the exact
  // "images all fetched then the spinner never stops" behavior. Desktop and
  // anything without file-sharing go straight to per-file downloads below.
  if (isLikelyMobile() && typeof navigator !== "undefined" && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: "Your slideshow" });
      return;
    } catch (error) {
      // Backing out of the share sheet throws AbortError -- that's a
      // completed, intentional "no thanks," not a failure to recover
      // from by also firing off N separate downloads behind their back.
      if (error instanceof Error && error.name === "AbortError") return;
      // Any other share failure falls through to the plain-download path
      // below instead of leaving the user with nothing.
    }
  }

  // Direct per-file downloads: the reliable path on desktop (and the
  // fallback for any browser without file-sharing). One plain download per
  // image, no archive step. A short pause between each keeps the browser
  // from treating a burst of downloads as spam and blocking them; the
  // delayed revoke avoids the same premature-cleanup race the old zip
  // download had.
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    await new Promise((resolve) => setTimeout(resolve, 350));
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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
