import { env } from "@viraltiktokslideshows/env/server";
import * as arctic from "arctic";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// Arctic is a minimal OAuth 2.0 client — it only builds the authorization
// URL and exchanges the code for tokens, nothing else. Sessions, users, and
// cookies are all handled by our own code (session.ts, this file's cookie
// helpers, and the routes in index.ts), not by Arctic.
export const google = new arctic.Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.SERVER_URL}/api/auth/google/callback`,
);

const OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes — just long enough for the Google consent screen

type OAuthState = {
  state: string;
  codeVerifier: string;
  callbackURL: string;
};

// State + PKCE code verifier are round-tripped through a short-lived,
// httpOnly cookie rather than a database row — neither needs to outlive a
// single OAuth attempt, so there's nothing to clean up later.
export function setOAuthStateCookie(c: Context, value: OAuthState) {
  setCookie(c, OAUTH_STATE_COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export function readOAuthStateCookie(c: Context): OAuthState | null {
  const raw = getCookie(c, OAUTH_STATE_COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthState;
  } catch {
    return null;
  }
}

export function clearOAuthStateCookie(c: Context) {
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, { path: "/" });
}

export type GoogleIdTokenClaims = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export function decodeGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  return arctic.decodeIdToken(idToken) as GoogleIdTokenClaims;
}
