import crypto from "node:crypto";

import prisma from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";

import { sendMail } from "./mailer";

// 100% custom — no magic-link plugin from any auth library. Same
// hash-before-storing pattern as session.ts: the raw token only ever exists
// in the email and, briefly, in the verification URL the user clicks.
const TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function renderMagicLinkEmail(url: string) {
  const text = `Sign in to Viral TikTok Slideshows\n\n${url}\n\nThis link expires in 15 minutes and can only be used once. If you didn't request it, you can ignore this email.`;
  const html = `
    <div style="background:#f5efe4;padding:32px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
      <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:32px 28px 24px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
              <span style="display:inline-block;width:22px;height:22px;background:#110f0d;border-radius:8px;vertical-align:middle;"></span>
              <span style="font-weight:700;font-size:15px;color:#110f0d;vertical-align:middle;">Viral Tiktok Slideshows</span>
            </div>
            <h1 style="font-size:20px;font-weight:700;color:#110f0d;margin:0 0 12px;">Sign in to your account</h1>
            <p style="font-size:14px;line-height:1.6;color:#948c7e;margin:0 0 24px;">
              Click the button below to sign in. This link expires in 15 minutes and can only be used once.
            </p>
            <a href="${url}" style="display:inline-block;background:#ffb020;color:#110f0d;font-weight:600;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:16px;">
              Sign in
            </a>
            <p style="font-size:12px;line-height:1.6;color:#948c7e;margin:24px 0 0;">
              Didn't request this? You can safely ignore this email.
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
// verification (e.g. /generate/checkout for the pay-to-unlock flow) — it's
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
