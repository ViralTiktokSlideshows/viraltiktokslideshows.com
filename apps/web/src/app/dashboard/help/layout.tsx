import type { Metadata } from "next";

// page.tsx below is a client component (search filter + accordion), so
// metadata lives here instead — same pattern as generate/success,
// generate/error, generate/checkout, auth/error, dashboard/saved.
export const metadata: Metadata = { title: "Help & Support" };

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
