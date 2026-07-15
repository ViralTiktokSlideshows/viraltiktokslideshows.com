"use client";

import { env } from "@viraltiktokslideshows/env/web";

import { authedFetch } from "./api-fetch";
import type { PlanTier, PlanUsage } from "./auth-client";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

export type UserSettings = {
  name: string | null;
  email: string;
  image: string | null;
  hasGoogle: boolean;
  defaultFormat: SlideFormat;
  autoAppendHashtags: boolean;
  // True once the user has ever completed a Dodo payment (i.e. has a
  // dodoCustomerId). Before that, Dodo's hosted Customer Portal has
  // nothing to show them, so the Settings page disables "Manage billing"
  // until this flips true.
  hasBillingHistory: boolean;
  plan: PlanUsage | null;
};

// Every endpoint below requires a signed-in session (see the "Not
// authenticated" 401 checks in apps/server/src/index.ts) -- authedFetch
// redirects to /signup automatically if the session cookie is missing or
// expired, so callers here only need to handle real application errors.
async function apiFetch(path: string, init?: RequestInit) {
  return authedFetch(`${SERVER_URL}${path}`, init);
}

export async function fetchSettings(): Promise<UserSettings | null> {
  const res = await apiFetch("/api/settings");
  if (!res.ok) return null;
  return res.json();
}

export async function updateSettings(
  patch: Partial<Pick<UserSettings, "name" | "defaultFormat" | "autoAppendHashtags">>,
): Promise<UserSettings> {
  const res = await apiFetch("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Could not update settings.");
  }
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await apiFetch("/api/account", { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Could not delete your account.");
  }
}

// Redirects the browser straight to Dodo's hosted Customer Portal — there's
// nothing to render on our side, so callers just await this and bail if it
// throws (e.g. no purchase yet, see the 404 case in index.ts).
export async function openBillingPortal(): Promise<void> {
  const res = await apiFetch("/api/billing/portal", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Could not open billing portal.");
  }
  const data = await res.json();
  if (typeof data?.url === "string") {
    window.location.href = data.url;
  }
}

// Starts a subscription checkout for one of the three plan tiers and
// redirects straight to Dodo's hosted checkout -- same shape as
// openBillingPortal above, nothing to render on our side while it resolves.
export async function subscribeToPlan(tier: PlanTier): Promise<void> {
  const res = await apiFetch("/api/billing/subscribe", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Could not start checkout.");
  }
  const data = await res.json();
  if (typeof data?.checkoutUrl === "string") {
    window.location.href = data.checkoutUrl;
  }
}

export const FORMAT_LABELS: Record<SlideFormat, string> = {
  STORYTIME: "Storytime",
  LISTICLE: "Listicle",
  HOT_TAKE: "Hot take",
};
