"use client";

import { env } from "@viraltiktokslideshows/env/web";

import { authedFetch } from "./api-fetch";
import { composeSlideImage } from "./compose-slide-image";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PurchaseStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";
export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

export type PurchaseSummary = {
  id: string;
  idea: string;
  slides: { index: number; text: string; imageUrl?: string }[];
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
export async function saveSlidesToDevice(
  purchaseId: string,
  slides: { index: number; text: string; imageUrl?: string }[],
): Promise<void> {
  const withImages = slides.filter((slide) => slide.imageUrl);
  if (withImages.length === 0) {
    throw new Error("No images are available for this slideshow yet.");
  }

  const files: File[] = [];
  for (const slide of withImages) {
    const res = await authedFetch(
      `${SERVER_URL}/api/purchases/${purchaseId}/slides/${slide.index}/image`,
    );
    if (!res.ok) continue;
    const backgroundBlob = await res.blob();
    const composedBlob = await composeSlideImage(backgroundBlob, slide.text);
    files.push(
      new File([composedBlob], `slide-${String(slide.index).padStart(2, "0")}.png`, {
        type: "image/png",
      }),
    );
  }

  if (files.length === 0) {
    throw new Error("Could not download this slideshow.");
  }

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files })) {
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

  // Fallback for browsers without file-sharing support (most desktop
  // browsers): one plain download per image, still no archive step. A
  // short pause between each keeps the browser from treating a burst of
  // downloads as spam and blocking them; the delayed revoke avoids the
  // same premature-cleanup race the old zip download had.
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
