import prisma from "@viraltiktokslideshows/db";
import type { User } from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";
import * as arctic from "arctic";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import JSZip from "jszip";
import { Webhook } from "standardwebhooks";

import {
  createBillingPortalSession,
  createPlanCheckoutSession,
  createUnlockCheckoutSession,
  dodo,
} from "./lib/dodo";
import { fillRemainingSlideImages, generateSlideshow } from "./lib/generate-slideshow";
import {
  clearOAuthStateCookie,
  decodeGoogleIdToken,
  google,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from "./lib/google-oauth";
import { isMagicLinkRateLimited, sendMagicLinkEmail, verifyMagicLinkToken } from "./lib/magic-link";
import { getPlanUsage, planTierForProductId, productIdForPlanTier } from "./lib/plans";
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
    allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE"],
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

const DEFAULT_CALLBACK_URL = `${env.CORS_ORIGIN}/generate`;

// The final redirect after either auth flow completes happens from *this*
// server's own response (api.viraltiktokslideshows.com), not from whatever
// page the browser was last on -- so callbackURL must always be a
// fully-qualified URL on the web app's own origin. A bare path like
// "/dashboard" would otherwise resolve against this server's origin
// instead and strand the user on the API domain. This also doubles as an
// open-redirect guard: a callbackURL pointing at any origin other than
// CORS_ORIGIN is rejected in favor of the default, rather than honored.
function sanitizeCallbackURL(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_CALLBACK_URL;
  try {
    const url = new URL(candidate);
    const allowed = new URL(env.CORS_ORIGIN);
    return url.origin === allowed.origin ? url.toString() : DEFAULT_CALLBACK_URL;
  } catch {
    // Not a parseable absolute URL (e.g. a bare "/dashboard" path) -- the
    // web app should always resolve these to absolute before they reach
    // here (see apps/web/src/lib/site-url.ts), but fall back safely if one
    // slips through.
    return DEFAULT_CALLBACK_URL;
  }
}

// First-time sign-ins (hasCompletedOnboarding still false) land on
// /onboarding instead of wherever they were headed -- but only when the
// destination was one of these generic, no-specific-intent entry points.
// Deliberate destinations (DashboardShell sending someone back to the page
// they were on, the checkout page's sign-in-and-pay step resuming an
// in-progress $2 unlock) are never overridden -- interrupting an active
// purchase with onboarding would be a genuine regression, not a feature.
const GENERIC_ENTRY_PATHS = new Set(["/", "/generate"]);

function applyOnboardingRedirect(callbackURL: string, user: { hasCompletedOnboarding: boolean }): string {
  if (user.hasCompletedOnboarding) return callbackURL;
  try {
    const path = new URL(callbackURL).pathname;
    if (GENERIC_ENTRY_PATHS.has(path)) {
      return `${env.CORS_ORIGIN}/onboarding`;
    }
  } catch {
    // Not a parseable URL -- leave it alone, sanitizeCallbackURL already
    // guarantees callers only ever see fully-qualified values by this point.
  }
  return callbackURL;
}

// --- Google OAuth (via arctic) ---

app.get("/api/auth/google", async (c) => {
  const callbackURL = sanitizeCallbackURL(c.req.query("callbackURL"));
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

    return c.redirect(applyOnboardingRedirect(stored.callbackURL, user));
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return c.redirect(`${env.CORS_ORIGIN}/auth/error?reason=google_failed`);
  }
});

// --- Magic link (100% custom) ---

app.post("/api/auth/magic-link", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const callbackURL = sanitizeCallbackURL(typeof body?.callbackURL === "string" ? body.callbackURL : null);

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
  const callbackURL = sanitizeCallbackURL(c.req.query("callbackURL"));

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

  return c.redirect(applyOnboardingRedirect(callbackURL, user));
});

// --- Session introspection + sign out ---

app.get("/api/auth/session", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ user: null });
  const plan = await getPlanUsage(user);
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      plan,
    },
  });
});

// Marks onboarding as done -- called by /onboarding's "Skip for now" link
// and automatically once a first-time user starts generating from there.
// Idempotent: signing in again after this never shows onboarding, no
// matter how it was completed.
app.post("/api/onboarding/complete", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { hasCompletedOnboarding: true },
  });

  return c.json({ success: true });
});

app.post("/api/auth/sign-out", async (c) => {
  const token = getSessionCookie(c);
  if (token) await invalidateSessionToken(token);
  clearSessionCookie(c);
  return c.json({ success: true });
});

// --- Settings ---

const SLIDE_FORMATS = ["STORYTIME", "LISTICLE", "HOT_TAKE"] as const;

app.get("/api/settings", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  const plan = await getPlanUsage(user);

  return c.json({
    name: user.name,
    email: user.email,
    image: user.image,
    hasGoogle: Boolean(user.googleId),
    defaultFormat: user.defaultFormat,
    autoAppendHashtags: user.autoAppendHashtags,
    hasBillingHistory: Boolean(user.dodoCustomerId),
    plan,
  });
});

// Partial update — only the fields the caller actually sends are touched, so
// the Settings page can fire one PATCH per control (name edit, format
// switch, hashtag toggle) without clobbering the others.
app.patch("/api/settings", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const data: {
    name?: string;
    defaultFormat?: (typeof SLIDE_FORMATS)[number];
    autoAppendHashtags?: boolean;
  } = {};

  if (typeof body?.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length === 0 || trimmed.length > 80) {
      return c.json({ error: "Name must be 1-80 characters" }, 400);
    }
    data.name = trimmed;
  }

  if (body?.defaultFormat !== undefined) {
    if (!SLIDE_FORMATS.includes(body.defaultFormat)) {
      return c.json({ error: "Invalid format" }, 400);
    }
    data.defaultFormat = body.defaultFormat;
  }

  if (body?.autoAppendHashtags !== undefined) {
    if (typeof body.autoAppendHashtags !== "boolean") {
      return c.json({ error: "autoAppendHashtags must be a boolean" }, 400);
    }
    data.autoAppendHashtags = body.autoAppendHashtags;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  const plan = await getPlanUsage(updated);

  return c.json({
    name: updated.name,
    email: updated.email,
    image: updated.image,
    hasGoogle: Boolean(updated.googleId),
    defaultFormat: updated.defaultFormat,
    autoAppendHashtags: updated.autoAppendHashtags,
    hasBillingHistory: Boolean(updated.dodoCustomerId),
    plan,
  });
});

// Cascades to sessions and purchases (see schema.prisma onDelete: Cascade) —
// this is a genuine, irreversible account delete, not a soft-disable.
app.delete("/api/account", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  await prisma.user.delete({ where: { id: user.id } });

  const token = getSessionCookie(c);
  if (token) await invalidateSessionToken(token).catch(() => {});
  clearSessionCookie(c);

  return c.json({ success: true });
});

// Dodo's hosted Customer Portal — see lib/dodo.ts. Only exists once someone
// has a dodoCustomerId, which is only set the first time a payment actually
// succeeds (captured in the webhook below), so there's genuinely nothing to
// manage before that regardless of plan.
app.post("/api/billing/portal", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  if (!user.dodoCustomerId) {
    return c.json(
      { error: "Billing opens up after your first purchase — nothing to manage yet." },
      404,
    );
  }

  try {
    const session = await createBillingPortalSession(
      user.dodoCustomerId,
      `${env.CORS_ORIGIN}/dashboard/settings`,
    );
    return c.json({ url: session.link });
  } catch (error) {
    console.error("Failed to create Dodo billing portal session", error);
    return c.json({ error: "Could not open billing portal. Try again." }, 502);
  }
});

const PLAN_TIERS = ["CREATOR", "PRO", "AGENCY"] as const;

// Starts a subscription checkout for one of the three plan tiers. Same
// Checkout Sessions method as the $2 unlock (createUnlockCheckoutSession)
// -- Dodo's own docs recommend it over the deprecated POST /subscriptions
// endpoint -- just pointed at a recurring product id with userId in
// metadata instead of purchaseId, so /api/webhooks/dodo's subscription.*
// handling knows which User row to update once it fires.
app.post("/api/billing/subscribe", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Not authenticated" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const tier = body?.tier;
  if (!PLAN_TIERS.includes(tier)) {
    return c.json({ error: "Invalid plan" }, 400);
  }

  const productId = productIdForPlanTier(tier);
  if (!productId) {
    // The Dodo product for this tier hasn't been created/configured yet
    // (see DODO_CREATOR_PRODUCT_ID etc. in packages/env) -- surface a
    // clear, expected failure rather than a crash.
    return c.json({ error: "This plan isn't available yet -- check back soon." }, 501);
  }

  try {
    const session = await createPlanCheckoutSession({
      userId: user.id,
      productId,
      customerEmail: user.email,
      customerName: user.name || user.email,
      returnUrl: `${env.CORS_ORIGIN}/dashboard/settings?subscribed=1`,
    });
    return c.json({ checkoutUrl: session.checkout_url });
  } catch (error) {
    console.error("Failed to create Dodo subscription checkout session", error);
    return c.json({ error: "Could not start checkout. Try again." }, 502);
  }
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

  // No format-picker step in the generate flow (see generate-flow.tsx) — a
  // signed-in user's Settings > Generation defaults preference is applied
  // invisibly instead. Signed-out visitors (the common free-preview path)
  // just get the STORYTIME default.
  const user = c.get("user");
  const format = (user?.defaultFormat ?? "STORYTIME") as "STORYTIME" | "LISTICLE" | "HOT_TAKE";

  try {
    const generated = await generateSlideshow(idea, format);
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

  // Quota-first: an active plan with room left in the current billing
  // period covers this generation for free, no Dodo checkout at all. The
  // Purchase is created already PAID + includedInPlan, and the client is
  // sent straight to the success page it already knows how to handle --
  // both callers (reveal-step.tsx, generate/checkout/page.tsx) just do
  // `window.location.href = checkoutUrl`, so a same-origin success URL
  // here works exactly like a Dodo one would.
  const planUsage = await getPlanUsage(user);
  if (planUsage && planUsage.used < planUsage.cap) {
    let planPurchase: Awaited<ReturnType<typeof prisma.purchase.create>>;
    try {
      planPurchase = await prisma.purchase.create({
        data: {
          userId: user.id,
          idea,
          formats,
          vibes,
          slides: enrichedSlides,
          idempotencyKey: idempotencyKey ?? undefined,
          format: user.defaultFormat,
          status: "PAID",
          includedInPlan: true,
          amount: 0,
        },
      });
    } catch (error) {
      if (idempotencyKey) {
        const existing = await prisma.purchase.findUnique({ where: { idempotencyKey } });
        if (existing) {
          return c.json({
            checkoutUrl: `${env.CORS_ORIGIN}/generate/success?purchase=${existing.id}`,
            purchaseId: existing.id,
          });
        }
      }
      console.error("Failed to create plan-covered purchase", error);
      return c.json({ error: "Could not start checkout" }, 502);
    }

    return c.json({
      checkoutUrl: `${env.CORS_ORIGIN}/generate/success?purchase=${planPurchase.id}`,
      purchaseId: planPurchase.id,
    });
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
        // Snapshot of the same preference /api/generate used for this
        // idea's text — kept alongside the purchase so /dashboard/saved
        // can show what style it was written in.
        format: user.defaultFormat,
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

  let purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
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

  // Fallback for when the webhook hasn't (or can't) land: Dodo's webhook
  // servers can't reach a local http://localhost:3000 during dev, so a
  // PENDING row here can sit forever with no error -- and even in prod the
  // webhook can lag behind the customer's redirect back to us. Dodo's own
  // return_url already carries a payment_id, so if the client passes it and
  // we're still PENDING, look the payment up directly instead of waiting on
  // a webhook that may never arrive. metadata.purchaseId is checked against
  // *this* purchase (not just trusted from the query string) so a guessed
  // or spoofed payment_id can't be used to mark someone else's purchase paid.
  const paymentId = c.req.query("payment_id");
  if (purchase.status === "PENDING" && paymentId) {
    try {
      const payment = await dodo.payments.retrieve(paymentId);
      const metaPurchaseId = (payment.metadata as Record<string, string> | undefined)?.purchaseId;

      if (metaPurchaseId === purchase.id) {
        if (payment.status === "succeeded") {
          purchase = await prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: "PAID", dodoPaymentId: payment.payment_id },
          });
        } else if (payment.status === "failed") {
          purchase = await prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: "FAILED" },
          });
        } else if (payment.status === "cancelled") {
          purchase = await prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: "CANCELED" },
          });
        }
        // Any other status (processing, requires_*) -- leave PENDING as-is,
        // the frontend just keeps polling.
      }
    } catch (error) {
      // Lookup failing (bad id, transient Dodo error, etc.) isn't fatal --
      // fall through and return whatever status the DB already had.
      console.error("Dodo payment status fallback lookup failed", error);
    }
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
      saved: p.saved,
      format: p.format,
    })),
  });
});

// Stars/unstars a purchase for /dashboard/saved — deliberately not
// status-gated (unlike download): someone can star a PENDING or FAILED
// attempt's idea to come back to, not just a PAID one.
app.patch("/api/purchases/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const purchaseId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  if (typeof body?.saved !== "boolean") {
    return c.json({ error: "saved must be a boolean" }, 400);
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.userId !== user.id) {
    return c.json({ error: "Purchase not found" }, 404);
  }

  const updated = await prisma.purchase.update({
    where: { id: purchaseId },
    data: { saved: body.saved },
  });

  return c.json({ id: updated.id, saved: updated.saved });
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

  // "uint8array" (not "nodebuffer") — Hono's c.body() wants a plain
  // Uint8Array<ArrayBuffer>, and Node's Buffer type doesn't structurally
  // match that under strict TS lib typings. Uint8Array.from(...) forces a
  // freshly-allocated, non-shared ArrayBuffer backing so it satisfies that
  // generic even though JSZip's own return type is Uint8Array<ArrayBufferLike>.
  const zipBuffer = Uint8Array.from(await zip.generateAsync({ type: "uint8array" }));

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
  const type: string | undefined = payload?.type;

  // Subscription lifecycle events carry userId in metadata (see
  // createPlanCheckoutSession in lib/dodo.ts), not purchaseId -- handled
  // separately from the payment.*/purchaseId branch below. Event names and
  // the data object's field names (subscription_id, product_id,
  // customer.customer_id, previous_billing_date, next_billing_date) come
  // from Dodo's Subscription Integration Guide -- like the payment.*
  // handling below, these haven't been exercised against a live webhook
  // from here, so double check field names once DODO_PAYMENTS_WEBHOOK_KEY
  // is wired to a real account with an active subscription product.
  //
  // subscription.cancelled and subscription.expired are both real,
  // documented Dodo event types (confirmed against the dodopayments SDK's
  // own WebhookEventType union) -- the earlier assumption that cancellation
  // only surfaced via the generic "subscription.updated" event was wrong,
  // and left cancelled subscribers stuck on planStatus: "ACTIVE" forever
  // (getPlanUsage in lib/plans.ts only checks that one field, so nothing
  // ever actually cut off their quota). Both handled explicitly below.
  if (type?.startsWith("subscription.")) {
    const data = payload?.data;
    const dodoSubscriptionId: string | undefined = data?.subscription_id;
    const dodoCustomerId: string | undefined = data?.customer?.customer_id;

    if (type === "subscription.active" || type === "subscription.renewed") {
      const userId: string | undefined = data?.metadata?.userId;
      const productId: string | undefined = data?.product_id;
      const tier = productId ? planTierForProductId(productId) : null;

      if (userId && dodoSubscriptionId && tier) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            planTier: tier,
            planStatus: "ACTIVE",
            dodoSubscriptionId,
            planPeriodStart: data?.previous_billing_date ? new Date(data.previous_billing_date) : new Date(),
            planPeriodEnd: data?.next_billing_date ? new Date(data.next_billing_date) : null,
            ...(dodoCustomerId ? { dodoCustomerId } : {}),
          },
        });
      } else {
        console.error("subscription.active/renewed missing userId/subscription_id/known product_id", {
          userId,
          dodoSubscriptionId,
          productId,
        });
      }
    } else if (type === "subscription.on_hold" && dodoSubscriptionId) {
      await prisma.user.updateMany({
        where: { dodoSubscriptionId },
        data: { planStatus: "ON_HOLD" },
      });
    } else if (type === "subscription.failed" && dodoSubscriptionId) {
      // Terminal per Dodo's docs -- the subscription cannot be reactivated,
      // the customer has to start a new one. Only matters here if a plan
      // had already gone ACTIVE and later failed in a way that surfaces as
      // "failed" rather than "on_hold"; a no-op if this fires for an
      // attempt that never made it to ACTIVE.
      await prisma.user.updateMany({
        where: { dodoSubscriptionId },
        data: { planStatus: "FAILED" },
      });
    } else if (type === "subscription.cancelled" && dodoSubscriptionId) {
      // Dodo cancellations are cancel-at-period-end -- deliberately leave
      // planPeriodEnd untouched so getPlanUsage's grace-period check (see
      // lib/plans.ts) keeps quota usable through what's already been paid
      // for, instead of cutting access off mid-period the instant someone
      // cancels.
      await prisma.user.updateMany({
        where: { dodoSubscriptionId },
        data: { planStatus: "CANCELED" },
      });
    } else if (type === "subscription.expired" && dodoSubscriptionId) {
      // Terminal -- the paid period is genuinely over with nothing left to
      // grace-period against. Kept distinct from "cancelled" so the two are
      // still visible as different states even though both end access.
      await prisma.user.updateMany({
        where: { dodoSubscriptionId },
        data: { planStatus: "EXPIRED" },
      });
    }

    return c.json({ received: true });
  }

  const purchaseId: string | undefined = payload?.data?.metadata?.purchaseId ?? payload?.metadata?.purchaseId;

  if (!purchaseId || !type) {
    return c.json({ received: true });
  }

  if (type === "payment.succeeded") {
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "PAID",
        dodoPaymentId: payload?.data?.payment_id ?? payload?.data?.id ?? null,
      },
    });

    // First successful payment is also the first moment a Dodo customer id
    // exists for this user — capture it so Settings > Manage billing (Dodo's
    // hosted Customer Portal) has something to open. "Set once" guard: never
    // overwrite an id that's already there.
    const dodoCustomerId: string | undefined = payload?.data?.customer?.customer_id;
    if (dodoCustomerId) {
      await prisma.user.updateMany({
        where: { id: updatedPurchase.userId, dodoCustomerId: null },
        data: { dodoCustomerId },
      });
    }
  } else if (type === "payment.failed") {
    await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "FAILED" } });
  } else if (type === "payment.cancelled") {
    await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "CANCELED" } });
  }

  return c.json({ received: true });
});

export default app;
