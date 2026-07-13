import prisma from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";

import { sendMail } from "./mailer";

function magicLinkEmail(url: string) {
  const text = `Sign in to Viral TikTok Slideshows\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`;
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

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        const { text, html } = magicLinkEmail(url);
        await sendMail({
          to: email,
          subject: "Sign in to Viral TikTok Slideshows",
          text,
          html,
        });
      },
    }),
  ],

  // Both apps live under the same registrable domain in every environment
  // this project deploys to (localhost:3000/3001 in dev, subdomains of
  // viraltiktokslideshows.com in production) — SameSite=Lax cookies already
  // work for that, but this keeps sessions valid if the server ever moves to
  // a separate top-level domain from the web app.
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
  },
});
