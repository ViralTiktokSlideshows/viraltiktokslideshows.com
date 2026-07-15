import crypto from "node:crypto";

import prisma from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";

import { sendMail } from "./mailer";

// 100% custom -- no magic-link plugin from any auth library. Same
// hash-before-storing pattern as session.ts: the raw token only ever exists
// in the email and, briefly, in the verification URL the user clicks.
const TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

// DB-backed per-email throttle -- persists across restarts/instances (unlike
// an in-memory counter) since it just counts rows already being written to
// Postgres for every send. Caps how many links one inbox can be sent inside
// a rolling window, independent of who's asking for them.
const MAX_SENDS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15; // 15 minutes

export async function isMagicLinkRateLimited(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await prisma.magicLinkToken.count({
    where: { email, createdAt: { gte: windowStart } },
  });
  return count >= MAX_SENDS_PER_WINDOW;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Brand tokens, matching packages/ui/src/styles/globals.css (--void, --bone)
// and the accent used on primary buttons across the app. Email clients
// strip external stylesheets and custom @font-face is unreliable, so these
// are inlined and the font stack falls back to system UI fonts rather than
// Clash Display.
const VOID = "#110f0d";
const BONE = "#f5efe4";
const MUTED = "#948c7e";
const ACCENT = "#ffb020";
const LOGO_URL = `${env.CORS_ORIGIN}/logo-mark.png`;

function renderMagicLinkEmail(url: string) {
  const text = `Sign in to Viral TikTok Slideshows\n\n${url}\n\nThis link expires in 15 minutes and can only be used once. If you didn't request it, you can ignore this email.`;
  const html = `
    <div style="background:${BONE};padding:32px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
      <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:32px 28px 24px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
              <img
                src="${LOGO_URL}"
                width="28"
                height="28"
                alt="Viral TikTok Slideshows"
                style="display:block;width:28px;height:28px;border-radius:8px;"
              />
              <span style="font-weight:700;font-size:15px;color:${VOID};vertical-align:middle;">Viral Tiktok Slideshows</span>
            </div>
            <h1 style="font-size:20px;font-weight:700;color:${VOID};margin:0 0 12px;">Sign in to your account</h1>
            <p style="font-size:14px;line-height:1.6;color:${MUTED};margin:0 0 24px;">
              Click the button below to sign in. This link expires in 15 minutes and can only be used once.
            </p>
            <a href="${url}" style="display:inline-block;background:${ACCENT};color:${VOID};font-weight:600;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:16px;">
              Sign in
            </a>
            <p style="font-size:12px;line-height:1.6;color:${MUTED};margin:24px 0 0;">
              Didn't request this? You can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #f0ebe0;">
            <p style="font-size:11px;line-height:1.6;color:${MUTED};margin:0;">
              Viral TikTok Slideshows &middot; viraltiktokslideshows.com
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
  return { text, html };
}

// Creates a MagicLinkToken row and emails the sign-in link. `callbackURL` is
// the page on the web app the user should land on after a successful
// verification (e.g. /generate/checkout for the pay-to-unlock flow) -- it's
// carried through the verification URL as a query param, not stored server
// side, since it's not sensitive and doesn't need to survive a restart.
export async function sendMagicLinkEmail(email: string, callbackURL: string) {
  const token = generateToken();

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const url = new URL(`${env.SERVER_URL}/api/auth/magic-link/callback`);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);

  const { text, html } = renderMagicLinkEmail(url.toString());
  await sendMail({
    to: email,
    subject: "Sign in to Viral TikTok Slideshows",
    text,
    html,
  });
}

// Single-use: a token that verifies successfully is immediately marked
// consumed, so a second click on the same email link (or an email-scanner
// prefetch beating the real user to it) fails instead of silently reusing
// the same sign-in.
export async function verifyMagicLinkToken(token: string): Promise<{ email: string } | null> {
  const tokenHash = hashToken(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { email: record.email };
}
