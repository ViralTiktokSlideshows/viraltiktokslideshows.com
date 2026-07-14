import prisma, { type User } from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";
import * as arctic from "arctic";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import JSZip from "jszip";
import { Webhook } from "standardwebhooks";

import { createUnlockCheckoutSession } from "./lib/dodo";
import { fillRemainingSlideImages, generateSlideshow } from "./lib/generate-slideshow";
import {
  clearOAuthStateCookie,
  decodeGoogleIdToken,
  google,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from "./lib/google-oauth";
import { isMagicLinkRateLimited, sendMagicLinkEmail, verifyMagicLinkToken } from "./lib/magic-link";
import { getClientIp, isRateLimited } from "./lib/rate-limit";
import { verifyTurnstileToken } from "./lib/turnstile";
import {
  clearSessionCookie,
  createSession,
  getSessionCookie,
  invalidateSessionToken,
  setSessionCookie,
  validateSessionToken,
} from "./lib/session";

const app = new Hono<{
  Variables: {
    user: User | null;
  };
}>();

app.use(logger());
// Must be registered before any route — otherwise cross-origin preflight
// requests never reach a matching handler.
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
  }),
);

// Loads the session (if any) for every request and stores the user on the
// Hono context so downstream routes — like /api/checkout/create — can read
// c.get("user") instead of re-validating the cookie themselves.
app.use("*", async (c, next) => {
  const token = getSessionCookie(c);
  if (!token) {
    c.set("user", null);
    await next();
    return;
  }
  const { user } = await validateSessionToken(token);
  c.set("user", user);
  await next();
});

const DEFAULT_CALLBACK_URL = `${env.CORS_ORIGIN}/`;

// --- Google OAuth (via arctic) ---

app.get("/api/auth/google", async (c) => {
  const callbackURL = c.req.query("callbackURL") || DEFAULT_CALLBACK_URL;
  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();

  setOAuthStateCookie(c, { state, codeVerifier, callbackURL });

  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
  return c.redirect(url.toString());
});

app.get("/api/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  const returnedState = c.req.query("state");
  const stored = readOAuthStateCookie(c);
  clearOAuthStateCookie(c);

  if (!code || !returnedState || !stored || returnedState !== stored.state) {
    return c.redirect(`${env.CORS_ORIGIN}/auth/error?reason=invalid_state`);
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, stored.codeVerifier);
    const claims = decodeGoogleIdToken(tokens.idToken());

    const user = await prisma.user.upsert({
      where: { email: claims.email },
      create: {
        email: claims.email,
        name: claims.name ?? claims.email,
        image: claims.picture,
        emailVerified: claims.email_verified ?? true,
        googleId: claims.sub,
      },
      update: {
        googleId: claims.sub,
        name: claims.name ?? undefined,
        image: claims.picture ?? undefined,
        emailVerified: claims.email_verified ?? true,
      },
    });

    const { token, session } = await createSession(user.id, {
      userAgent: c.req.header("User-Agent"),
    });
    setSessionCookie(c, token, session.expiresAt);

    return c.redirect(stored.callbackURL);
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return c.redirect(`${env.CORS_ORIGIN}/auth/error?reason=google_failed`);
  }
});

// --- Magic link (100% custom) ---

app.post("/api/auth/magic-link", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const callbackURL = typeof body?.callbackURL === "string" ? body.callbackURL : DEFAULT_CALLBACK_URL;

  if (!email || !email.includes("@")) {
    return c.json({ error: "A valid email is required" }, 400);
  }

  // Coarse per-IP throttle first (cheap, catches one client hammering many
  // different emails), then the persistent per-email throttle (catches one
  // inbox being spammed from anywhere). Both must pass.
  const ip = getClientIp(c);
  if (isRateLimited(`magic-link:ip:${ip}`, 10, 1000 * 60 * 15)) {
    return c.json({ error: "Too many requests. Try again in a few minutes." }, 429);
  }
  if (await isMagicLinkRateLimited(email)) {
    return c.json(
      { error: "Too many sign-in links requested for this email. Try again in a few minutes." },
      429,
    );
  }

  const humanVerified = await verifyTurnstileToken(body?.turnstileToken, ip);
  if (!humanVerified) {
    return c.json({ error: "Verification failed. Refresh and try again." }, 403);
  }

  await sendMagicLinkEmail(email, callbackURL);
  return c.json({ success: true });
});

app.get("/api/auth/magic-link/callback", async (c) => {
  const token = c.req.query("token");
  const callbackURL = c.req.query("callbackURL") || DEFAULT_CALLBACK_URL;

  if (!token) {
    return c.redirect(`${env.CORS_ORIGIN}/auth/error?reason=missing_token`);
  }

  const result = await verifyMagicLinkToken(token);
  if (!result) {
    return c.redirect(`${env.CORS_ORIGIN}/auth/error?reason=invalid_link`);
  }

  const user = await prisma.user.upsert({
    where: { email: result.email },
    create: { email: result.email, emailVerified: true },
    update: { emailVerified: true },
  });

  const { token: sessionToken, session } = await createSession(user.id, {
    userAgent: c.req.header("User-Agent"),
  });
  setSessionCookie(c, sessionToken, session.expiresAt);

  return c.redirect(callbackURL);
});

// --- Session introspection + sign out ---

app.get("/api/auth/session", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ user: null });
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  });
});

app.post("/api/auth/sign-out", async (c) => {
  const token = getSessionCookie(c);
  if (token) await invalidateSessionToken(token);
  clearSessionCookie(c);
  return c.json({ success: true });
});

app.get("/", (c) => {
  return c.text("OK");
});

// Real generation: slide text via OpenRouter (google/gemini-3.5-flash),
// then a real background image for the hook slide only via Ideogram — see
// lib/generate-slideshow.ts for why the rest of the images wait until
// checkout. This is free to call and unauthenticated, so it's both rate
// limited per-IP and gated behind Cloudflare Turnstile (see ./lib/turnstile.ts);
// a genuine failure surfaces as a real error (the client's GeneratingStep
// treats any non-2xx as a hard failure and shows the retry screen) rather
// than silently degrading to mock data.
app.post("/api/generate", async (c) => {
  const ip = getClientIp(c);
  if (isRateLimited(`generate:ip:${ip}`, 12, 1000 * 60 * 15)) {
    return c.json({ error: "Too many requests. Try again in a few minutes." }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";
  const formats = Array.isArray(body?.formats) ? body.formats : [];
  const vibes = Array.isArray(body?.vibes) ? body.vibes : [];

  if (!idea) {
    return c.json({ error: "An idea is required" }, 400);
  }

  const humanVerified = await verifyTurnstileToken(body?.turnstileToken, ip);
  if (!humanVerified) {
    return c.json({ error: "Verification failed. Refresh and try again." }, 403);
  }

  try {
    const generated = await generateSlideshow(idea);
    return c.json({
      id: crypto.randomUUID(),
      idea,
      formats,
      vibes,
      hook: generated.hook,
      slideCount: generated.slideCount,
      slides: generated.slides,
    });
  } catch (error) {
    console.error("Slideshow generation failed", error);
    return c.json({ error: "Could not generate a slideshow. Try again." }, 502);
  }
});

// Starts a $2 unlock purchase for the slideshow the client just got back
// from /api/generate. Requires an authenticated session — the web app is
// responsible for sending the user through sign-in first (see the
// generate-flow unlock step and /generate/checkout) before ever calling
// this. Creates a PENDING Purchase row first so the Dodo webhook has
// something to flip to PAID/FAILED/CANCELED once the customer finishes (or
// abandons) the hosted checkout.
app.post("/api/checkout/create", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const idea = typeof body?.idea === "string" ? body.idea : "";
  const formats = Array.isArray(body?.formats) ? body.formats : [];
  const vibes = Array.isArray(body?.vibes) ? body.vibes : [];
  const slides = Array.isArray(body?.slides) ? body.slides : [];
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null;

  // Same idempotencyKey means the same unlock attempt — a double-click, a
  // retry, or a magic-link sign-in resuming this attempt on another device.
  // Replay it instead of creating a second PENDING purchase / Dodo session.
  if (idempotencyKey) {
    const existing = await prisma.purchase.findUnique({ where: { idempotencyKey } });
    if (existing && existing.userId === user.id) {
      if (existing.status === "PAID") {
        return c.json({
          checkoutUrl: `${env.CORS_ORIGIN}/generate/success?purchase=${existing.id}`,
          purchaseId: existing.id,
        });
      }
      if (existing.checkoutUrl && existing.status === "PENDING") {
        return c.json({ checkoutUrl: existing.checkoutUrl, purchaseId: existing.id });
      }
    }
  }

  // This is the moment someone actually commits to paying — worth
  // spending Ideogram credits on the slides that were text-only during
  // the free preview. Runs before the Purchase row is created so the
  // stored slides snapshot already has every image, not just the hook.
  let enrichedSlides = slides;
  try {
    enrichedSlides = await fillRemainingSlideImages(slides);
  } catch (error) {
    console.error("Failed to fill remaining slide images, continuing with what we have", error);
  }

  let purchase: Awaited<ReturnType<typeof prisma.purchase.create>>;
  try {
    purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        idea,
        formats,
        vibes,
        slides: enrichedSlides,
        idempotencyKey: idempotencyKey ?? undefined,
      },
    });
  } catch (error) {
    // Unique constraint race: two requests with the same idempotencyKey
    // both passed the check above before either finished creating. Whoever
    // lost just reads back what the winner created.
    if (idempotencyKey) {
      const existing = await prisma.purchase.findUnique({ where: { idempotencyKey } });
      if (existing && existing.checkoutUrl) {
        return c.json({ checkoutUrl: existing.checkoutUrl, purchaseId: existing.id });
      }
    }
    console.error("Failed to create purchase", error);
    return c.json({ error: "Could not start checkout" }, 502);
  }

  try {
    const session = await createUnlockCheckoutSession({
      purchaseId: purchase.id,
      customerEmail: user.email,
      customerName: user.name || user.email,
      returnUrl: `${env.CORS_ORIGIN}/generate/success?purchase=${purchase.id}`,
    });

    const checkoutId = session.session_id ?? session.id ?? null;
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { dodoCheckoutId: checkoutId ?? undefined, checkoutUrl: session.checkout_url },
    });

    return c.json({ checkoutUrl: session.checkout_url, purchaseId: purchase.id });
  } catch (error) {
    console.error("Failed to create Dodo checkout session", error);
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "FAILED" },
    });
    return c.json({ error: "Could not start checkout" }, 502);
  }
});

// Lets the /generate/success and /generate/error pages check whether a
// purchase has been confirmed yet, since the Dodo webhook below can land
// slightly after the customer is redirected back to us.
app.get("/api/checkout/status", async (c) => {
  const purchaseId = c.req.query("purchase");
  if (!purchaseId) {
    return c.json({ error: "Missing purchase id" }, 400);
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) {
    return c.json({ error: "Purchase not found" }, 404);
  }

  // Only enforce ownership when a session is present. /generate/success
  // polls this right after the Dodo redirect lands (same browser, session
  // cookie should already be there) — but if it's somehow missing, we still
  // let the status through so that polling doesn't dead-end on an idle
  // signed-out visitor. A mismatched *signed-in* user, though, never sees
  // someone else's idea/slides.
  const user = c.get("user");
  if (user && purchase.userId !== user.id) {
    return c.json({ error: "Purchase not found" }, 404);
  }

  return c.json({
    status: purchase.status,
    idea: purchase.idea,
    slides: purchase.slides,
  });
});

// Powers /dashboard: every purchase attempt (unlock click) the signed-in
// user has made, newest first. "Attempt" because a row exists here the
// moment /api/checkout/create runs — before Dodo has confirmed anything —
// so PENDING/FAILED rows show up too, not just PAID ones.
app.get("/api/purchases", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    purchases: purchases.map((p) => ({
      id: p.id,
      idea: p.idea,
      slides: p.slides,
      status: p.status,
      createdAt: p.createdAt,
    })),
  });
});

// Real slide download (#2 from the loose-ends list) — fetches each
// slide's image server-side (avoids trusting the browser to read
// cross-origin bytes from Ideogram's CDN) and zips them into one file.
// Ownership-checked: only the user who unlocked this purchase can
// download it. Ideogram's image URLs are ephemeral, so this can fail if
// enough time has passed since checkout — see the note in lib/ideogram.ts.
app.get("/api/purchases/:id/download", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const purchaseId = c.req.param("id");
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });

  if (!purchase || purchase.userId !== user.id) {
    return c.json({ error: "Purchase not found" }, 404);
  }
  if (purchase.status !== "PAID") {
    return c.json({ error: "This slideshow isn't unlocked" }, 403);
  }

  const slides = Array.isArray(purchase.slides)
    ? (purchase.slides as { index: number; text: string; imageUrl?: string }[])
    : [];
  const withImages = slides.filter((slide) => slide.imageUrl);

  if (withImages.length === 0) {
    return c.json({ error: "No images are available for this slideshow yet" }, 404);
  }

  const zip = new JSZip();
  const results = await Promise.allSettled(
    withImages.map(async (slide) => {
      const res = await fetch(slide.imageUrl as string);
      if (!res.ok) throw new Error(`Failed to fetch slide ${slide.index} image`);
      const buffer = await res.arrayBuffer();
      zip.file(`slide-${String(slide.index).padStart(2, "0")}.png`, buffer);
    }),
  );

  const allFailed = results.every((result) => result.status === "rejected");
  if (allFailed) {
    // Almost certainly the ephemeral Ideogram URLs expired.
    return c.json(
      { error: "These images have expired. Regenerate the slideshow to download it." },
      410,
    );
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return c.body(zipBuffer, 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="slideshow-${purchase.id}.zip"`,
  });
});

// Dodo Payments webhook — confirms or fails a Purchase once the customer
// finishes the hosted checkout. Verified against the Standard Webhooks spec
// Dodo implements (https://standardwebhooks.com/) using the signing secret
// from Dashboard > Developer > Webhooks. The exact `type` values below
// (payment.succeeded/failed/cancelled) follow Dodo's documented naming
// convention — double check these against Dodo's Webhook Event Guide once
// DODO_PAYMENTS_WEBHOOK_KEY is wired up to a real account, since this
// couldn't be exercised against a live webhook from here.
app.post("/api/webhooks/dodo", async (c) => {
  const rawBody = await c.req.text();
  const webhook = new Webhook(env.DODO_PAYMENTS_WEBHOOK_KEY);

  try {
    await webhook.verify(rawBody, {
      "webhook-id": c.req.header("webhook-id") ?? "",
      "webhook-signature": c.req.header("webhook-signature") ?? "",
      "webhook-timestamp": c.req.header("webhook-timestamp") ?? "",
    });
  } catch (error) {
    console.error("Dodo webhook signature verification failed", error);
    return c.json({ error: "Invalid signature" }, 401);
  }

  const payload = JSON.parse(rawBody);
  const purchaseId: string | undefined = payload?.data?.metadata?.purchaseId ?? payload?.metadata?.purchaseId;
  const type: string | undefined = payload?.type;

  if (!purchaseId || !type) {
    return c.json({ received: true });
  }

  if (type === "payment.succeeded") {
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "PAID",
        dodoPaymentId: payload?.data?.payment_id ?? payload?.data?.id ?? null,
      },
    });
  } else if (type === "payment.failed") {
    await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "FAILED" } });
  } else if (type === "payment.cancelled") {
    await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "CANCELED" } });
  }

  return c.json({ received: true });
});

export default app;
