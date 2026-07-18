import { env } from "@viraltiktokslideshows/env/server";

// Accounts allowed to reach admin-only surfaces (the TikHub research page +
// its proxy). Set via ADMIN_EMAILS (comma-separated). Empty => nobody is an
// admin, so these surfaces are locked by default.
const ADMIN_EMAILS = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.toLowerCase());
}
