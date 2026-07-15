"use client";

import { env } from "@viraltiktokslideshows/env/web";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type SlideFormat = "STORYTIME" | "LISTICLE" | "HOT_TAKE";

export type UserSettings = {
  name: string | null;
  email: string;
  image: string | null;
  hasGoogle: boolean;
  defaultFormat: SlideFormat;
  autoAppendHashtags: boolean;
};

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${SERVER_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
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

export const FORMAT_LABELS: Record<SlideFormat, string> = {
  STORYTIME: "Storytime",
  LISTICLE: "Listicle",
  HOT_TAKE: "Hot take",
};
