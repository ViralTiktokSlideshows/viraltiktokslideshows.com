import { env } from "@viraltiktokslideshows/env/server";

// Server-side verification for Cloudflare Turnstile tokens minted by the
// widget on the client (see apps/web/src/components/turnstile-widget.tsx).
// Protects the two unauthenticated, abuse-prone endpoints: the free
// /api/generate (real OpenRouter + Ideogram cost per call) and
// /api/auth/magic-link (email-spam vector).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 10_000;

export async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (remoteIp) body.append("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { success?: boolean };
    return data?.success === true;
  } catch (err) {
    console.error("Turnstile verification request failed", err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
