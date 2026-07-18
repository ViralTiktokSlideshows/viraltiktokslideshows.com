import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // This server's own base URL — used to build the Google OAuth
    // redirect_uri (${SERVER_URL}/api/auth/google/callback) and the link
    // embedded in magic-link emails. Not the web app's URL; that's
    // CORS_ORIGIN above.
    SERVER_URL: z.url(),

    // Google OAuth, via the `arctic` client (arctic.Google) — see
    // apps/server/src/lib/google-oauth.ts. Authorized redirect URI in the
    // Google Cloud Console must match ${SERVER_URL}/api/auth/google/callback.
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    // Spacemail SMTP (magic link delivery via nodemailer)
    SMTP_HOST: z.string().min(1).default("mail.spacemail.com"),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    EMAIL_FROM: z.string().min(1).default("Viral TikTok Slideshows <noreply@viraltiktokslideshows.com>"),

    // Dodo Payments (checkout + webhooks for the $2 unlock)
    DODO_PAYMENTS_API_KEY: z.string().min(1),
    DODO_PAYMENTS_WEBHOOK_KEY: z.string().min(1),
    DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
    DODO_UNLOCK_PRODUCT_ID: z.string().min(1),

    // Dodo subscription products for the three plan tiers advertised on the
    // landing page's Pricing section. Optional (unlike DODO_UNLOCK_PRODUCT_ID
    // above) since these get created in the Dodo dashboard after the app is
    // already deployed and running on the $2 unlock alone -- POST
    // /api/billing/subscribe returns a clear 501 for any tier whose product
    // id isn't set yet, rather than the whole server failing to boot.
    DODO_CREATOR_PRODUCT_ID: z.string().min(1).optional(),
    DODO_PRO_PRODUCT_ID: z.string().min(1).optional(),
    DODO_AGENCY_PRODUCT_ID: z.string().min(1).optional(),

    // OpenRouter (slide text via google/gemini-3.5-flash) — see
    // apps/server/src/lib/openrouter.ts.
    OPENROUTER_API_KEY: z.string().min(1),

    // Ideogram (slide background images, v4 generate endpoint) — see
    // apps/server/src/lib/ideogram.ts. Only used for each free-preview
    // hook slide now; bulk post-unlock images moved to Pexels (below) to
    // cut per-slideshow image cost.
    IDEOGRAM_API_KEY: z.string().min(1),

    // Pexels (free stock-photo search) — see apps/server/src/lib/stock-photos.ts.
    // Backs every non-hook slide image after a paid unlock. Optional: if
    // unset, fillRemainingSlideImages falls back to Ideogram for everything,
    // same as before this integration existed.
    PEXELS_API_KEY: z.string().min(1).optional(),

    // Cloudflare R2 (S3-compatible) — persistent storage for Ideogram
    // images, which are only served from ephemeral, time-limited URLs. See
    // apps/server/src/lib/r2.ts. Bucket must have public access enabled
    // (either an r2.dev subdomain or a custom domain) — R2_PUBLIC_URL is
    // whichever of those you point at the bucket, no trailing slash.
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_PUBLIC_URL: z.url(),

    // Cloudflare Turnstile secret key — server-side verification of the
    // token the client gets from the widget. See apps/server/src/lib/turnstile.ts.
    TURNSTILE_SECRET_KEY: z.string().min(1),

    // TikHub (https://tikhub.io) — REST access to TikTok/social data, used
    // for content research (e.g. analysing real viral slideshows), NOT the
    // end-user product. See apps/server/src/lib/tikhub.ts. Optional: if unset,
    // the /api/research/tikhub proxy returns 503 instead of the server failing
    // to boot.
    TIKHUB_API_KEY: z.string().min(1).optional(),

    // Comma-separated list of account emails allowed to hit the admin-only
    // research routes (the TikHub proxy). Anyone signed in with an email in
    // this list can call it; everyone else gets 403. Optional, but the proxy
    // denies ALL requests when it's empty (safe default).
    ADMIN_EMAILS: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
