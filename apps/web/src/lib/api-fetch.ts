"use client";

// Shared by every client lib that calls an endpoint requiring a signed-in
// session (settings, purchases, checkout, billing). A 401 from any of those
// always means the session cookie is missing, expired, or was invalidated
// server-side -- there's nothing a retry or a stale UI can recover from, so
// this redirects straight to sign-in with the current page carried as
// callbackURL instead of leaving the page rendering broken/empty
// authenticated state.
export function redirectToSignIn() {
  if (typeof window === "undefined") return;
  const callbackURL = window.location.pathname + window.location.search;
  window.location.href = `/signup?callbackURL=${encodeURIComponent(callbackURL)}`;
}

// Drop-in replacement for fetch() with credentials + JSON headers already
// applied -- every authed client lib (settings-client, purchases-client,
// checkout-client) was duplicating this setup with its own local apiFetch.
// Callers that need the redirect-on-401 behavior should use this instead of
// raw fetch(); callers that intentionally allow a signed-out 401/200-null
// response (auth-client's own session check, checkout/status's anonymous
// polling) should keep using fetch() directly.
export async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    redirectToSignIn();
  }

  return res;
}
