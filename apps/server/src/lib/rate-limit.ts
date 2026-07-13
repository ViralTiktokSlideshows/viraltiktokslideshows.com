import type { Context } from "hono";

// Minimal in-memory fixed-window limiter. No dependency, no DB round trip —
// just a per-process Map, so it resets on restart and doesn't share state
// across multiple server instances. That's an acceptable tradeoff for a
// coarse, cheap-to-check first line of defense (e.g. "one IP can't hammer
// this endpoint"); anything that needs to persist or be authoritative
// across instances (like per-email magic-link throttling) is backed by the
// database instead — see isMagicLinkRateLimited in magic-link.ts.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodically drop expired buckets so this Map doesn't grow forever under
// sustained traffic from many distinct IPs.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  1000 * 60 * 10,
).unref?.();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) return true;

  bucket.count += 1;
  return false;
}

export function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return c.req.header("x-real-ip") ?? "unknown";
}
