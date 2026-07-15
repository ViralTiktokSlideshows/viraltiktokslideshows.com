import { headers } from "next/headers";

// Absolute origin for *this* request, derived from the incoming Host header
// rather than a hardcoded domain -- correct whether this is running on
// localhost:3001 during local dev or behind Coolify's reverse proxy in
// production, with no separate env var to keep in sync across
// environments. Only usable from Server Components/Route Handlers (needs
// the request's headers).
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "viraltiktokslideshows.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Resolves a callbackURL that may be a bare path (e.g. DashboardShell's
// redirect to `/signup?callbackURL=/dashboard`) or already absolute, always
// returning a fully-qualified URL. Needed because the eventual redirect
// back to the app happens from apps/server's response, not this page's own
// origin -- a relative path would resolve against api.viraltiktokslideshows.com
// instead of the web app and strand the user there. See also
// apps/server/src/index.ts's sanitizeCallbackURL, which enforces the same
// rule server-side as a backstop.
//
// `fallbackPath` is what to send the user to when no candidate callbackURL
// was supplied at all (a plain visit to /signup with no query param) --
// callers pick whatever makes sense for that entry point (e.g. "/generate"
// for the header's plain "Sign in" link) instead of this helper hardcoding
// one destination for every caller.
export async function resolveCallbackURL(
  candidate: string | undefined,
  fallbackPath = "/",
): Promise<string> {
  const origin = await getRequestOrigin();
  if (!candidate) return `${origin}${fallbackPath}`;
  try {
    return new URL(candidate, origin).toString();
  } catch {
    return `${origin}${fallbackPath}`;
  }
}
