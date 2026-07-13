import prisma, { type User } from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";
import * as arctic from "arctic";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Webhook } from "standardwebhooks";

import { createUnlockCheckoutSession } from "./lib/dodo";
import {
  clearOAuthStateCookie,
  decodeGoogleIdToken,
  google,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from "./lib/google-oauth";
import { sendMagicLinkEmail, verifyMagicLinkToken } from "./lib/magic-link";
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

// Mock generation endpoint. Returns the same 7-slide slideshow every time —
// stands in for the future Gemini + Ideogram pipeline described in the
// product spec so the frontend flow can be built against a stable contract.
app.post("/api/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const idea = typeof body?.idea === "string" ? body.idea : "";
  const formats = Array.isArray(body?.formats) ? body.formats : [];
  const vibes = Array.isArray(body?.vibes) ? body.vibes : [];

  const slides = [
    "Nobody tells you the first slide is the whole game",
    "Everyone's fighting for the first half-second of attention",
    "If slide one doesn't hook, slides 2-7 don't matter",
    "The best hooks promise a payoff, not just curiosity",
    "Structure beats cleverness: hook, tension, payoff",
    "Save-worthy slides give people a reason to screenshot",
    "Post it, then double down on what works",
  ];

  return c.json({
    id: "mock-slideshow-1",
    idea,
    formats,
    vibes,
    hook: slides[0],
    slideCount: slides.length,
    slides: slides.map((text, index) => ({ index: index + 1, text })),
  });
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

  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      idea,
      formats,
      vibes,
      slides,
    },
  });

  try {
    const session = await createUnlockCheckoutSession({
      purchaseId: purchase.id,
      customerEmail: user.email,
      customerName: user.name || user.email,
      returnUrl: `${env.CORS_ORIGIN}/generate/success?purchase=${purchase.id}`,
    });

    const checkoutId = session.session_id ?? session.id ?? null;
    if (checkoutId) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { dodoCheckoutId: checkoutId },
      });
    }

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

  return c.json({
    status: purchase.status,
    idea: purchase.idea,
    slides: purchase.slides,
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
