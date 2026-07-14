"use client";

import { useCallback, useEffect, useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";

// Thin, hand-written client for the custom auth endpoints on apps/server —
// no auth library on this side either. Every call goes to the server with
// credentials included so the session cookie it sets (see
// apps/server/src/lib/session.ts) round-trips on every request, even though
// web and server run on different origins in every environment this app
// deploys to.

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
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

// Full-page redirect into the server's OAuth flow — there's no popup/token
// exchange happening on this side, Google and the server handle all of
// that. `callbackURL` is where the server sends the browser back to once a
// session cookie has been set.
export function signInWithGoogle(callbackURL: string) {
  const url = new URL("/api/auth/google", SERVER_URL);
  url.searchParams.set("callbackURL", callbackURL);
  window.location.href = url.toString();
}

export async function sendMagicLink(email: string, callbackURL: string, turnstileToken: string) {
  const res = await apiFetch("/api/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email, callbackURL, turnstileToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Could not send the sign-in link. Try again.");
  }
}

export async function signOut() {
  await apiFetch("/api/auth/sign-out", { method: "POST" });
}

export async function fetchSession(): Promise<SessionUser | null> {
  const res = await apiFetch("/api/auth/session");
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ?? null;
}

// Reactive session state for client components — mirrors the shape of the
// hook-based session helpers other auth libraries expose (`user`,
// `isPending`), but backed entirely by our own GET /api/auth/session.
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async () => {
    setIsPending(true);
    const sessionUser = await fetchSession();
    setUser(sessionUser);
    setIsPending(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { user, isPending, refetch };
}
