import crypto from "node:crypto";

import prisma from "@viraltiktokslideshows/db";
import type { Session, User } from "@viraltiktokslideshows/db";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// Hand-rolled session tokens — no auth library. The pattern (opaque random
// token handed to the client, only its hash stored server-side) is the same
// one Lucia's own "rolling your own" guides recommend: a leaked database
// dump can't be replayed as a live session because the raw token that would
// be needed to look one up was never written to disk.

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  options?: { ipAddress?: string; userAgent?: string },
) {
  const token = generateSessionToken();
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    },
  });
  return { token, session };
}

// Explicit return type — otherwise tsc can't emit a portable .d.ts for this
// inferred type once it touches the generated Prisma User/SlideFormat enum
// (TS2883).
export async function validateSessionToken(
  token: string,
): Promise<{ session: Session | null; user: User | null }> {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return { session: null, user: null };

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return { session: null, user: null };
  }

  return { session, user: session.user };
}

export async function invalidateSessionToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

const isProduction = process.env.NODE_ENV === "production";

export function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}
