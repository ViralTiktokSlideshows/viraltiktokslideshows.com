"use client";

import { useEffect, useSyncExternalStore } from "react";

import { env } from "@viraltiktokslideshows/env/web";

// Thin, hand-written client for the custom auth endpoints on apps/server --
// no auth library on this side either. Every call goes to the server with
// credentials included so the session cookie it sets (see
// apps/server/src/lib/session.ts) round-trips on every request, even though
// web and server run on different origins in every environment this app
// deploys to.

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PlanTier = "CREATOR" | "PRO" | "AGENCY";

export type PlanUsage = {
  tier: PlanTier;
  label: string;
  used: number;
  cap: number;
  periodEnd: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  hasCompletedOnboarding: boolean;
  // Null means no active subscription -- single-unlock ($2/slideshow) is
  // always available regardless, this is purely about the optional
  // monthly-quota tier on top of it.
  plan: PlanUsage | null;
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

// --- Shared session store ---
//
// Every previous version of this hook kept its own local useState, fetched
// independently on mount, with nothing connecting one instance to another.
// That meant sign-out (a plain client-side POST, no page reload) updated
// whichever component called signOut() but left every *other* mounted
// useSession() consumer -- e.g. the marketing Header, if it happened to
// stay mounted across the client-side navigation that followed -- holding
// onto a stale signed-in user forever.
//
// This module-level store is the fix: one fetch, one piece of state, every
// useSession() call site subscribed to the same value via
// useSyncExternalStore, so sign-out/sign-in/refetch update every consumer
// in the tree simultaneously with no prop drilling or context provider
// needed anywhere.
//
// Module-level state that's mutated outside React is only safe here
// because every read/write is guarded to the browser (see the
// typeof window checks below) -- this module also gets evaluated during
// SSR for the initial render of any "use client" component that imports
// it, and a real singleton there would leak one visitor's session into
// another's server-rendered HTML across requests on the same server
// process. getServerSnapshot() always returns the same safe, un-signed-in
// default instead of touching the mutable store.
type SessionState = { user: SessionUser | null; isPending: boolean };

const SERVER_SNAPSHOT: SessionState = { user: null, isPending: true };
let sessionState: SessionState = SERVER_SNAPSHOT;
let initialFetchStarted = false;
const listeners = new Set<() => void>();

function setSessionState(next: SessionState) {
  sessionState = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SessionState {
  return sessionState;
}

function getServerSnapshot(): SessionState {
  return SERVER_SNAPSHOT;
}

export async function fetchSession(): Promise<SessionUser | null> {
  const res = await apiFetch("/api/auth/session");
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ?? null;
}

// Re-validates the session against the server and updates the shared store
// -- but, unlike refetchSession below, hands the fresh value straight back
// to the caller instead of making them wait for a re-render to see it.
// Needed anywhere a stale cached `user` from useSession() would be
// dangerous to trust blindly: right before a payment-critical action like
// starting checkout, the cached value could be minutes old (expired
// session, signed out in another tab, etc.) even though the sidebar still
// shows "signed in" from the last successful check.
export async function getFreshUser(): Promise<SessionUser | null> {
  setSessionState({ user: sessionState.user, isPending: true });
  const sessionUser = await fetchSession();
  setSessionState({ user: sessionUser, isPending: false });
  return sessionUser;
}

async function refetchSession() {
  await getFreshUser();
}

// Full-page redirect into the server's OAuth flow -- there's no popup/token
// exchange happening on this side, Google and the server handle all of
// that. `callbackURL` is where the server sends the browser back to once a
// session cookie has been set. Because this is a real navigation, the page
// -- and this module -- reloads fresh on the way back, so the store
// picking up the new signed-in session on that fresh load is automatic;
// no explicit refetch call needed here.
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

// Sign-out is a hard navigation back to the landing page, not a soft
// client-side one -- previously every caller (sidebar's ProfileMenu,
// Header's desktop + mobile menus) did their own router.push("/") after
// this resolved, which could land the user back on whatever
// signed-in-only page they started from (e.g. /dashboard/settings) if
// that page's own effects re-ran and raced the client-side navigation.
// window.location.href sidesteps that entirely: it's a real page load,
// can't be interrupted by component state, and guarantees every other
// piece of client state (not just the session store) resets too. The
// store is still cleared first so any component that happens to render
// again before the navigation completes shows signed-out, not stale data.
export async function signOut() {
  await apiFetch("/api/auth/sign-out", { method: "POST" });
  setSessionState({ user: null, isPending: false });
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

// Reactive session state for client components -- mirrors the shape of the
// hook-based session helpers other auth libraries expose (`user`,
// `isPending`), but backed entirely by our own GET /api/auth/session and
// the shared store above instead of per-instance local state.
export function useSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Only the first mounted consumer actually kicks off the fetch --
    // every later mount (or remount, e.g. navigating between pages that
    // each render their own useSession() caller) just reads whatever the
    // shared store already has. Guarded to the browser: effects don't run
    // during SSR anyway, but this also protects against the module being
    // evaluated more than once in dev/Fast Refresh.
    if (initialFetchStarted || typeof window === "undefined") return;
    initialFetchStarted = true;
    refetchSession();
  }, []);

  return { user: state.user, isPending: state.isPending, refetch: refetchSession };
}
