import type { Metadata } from "next";

// page.tsx below is a client component (star/unsave interactivity), so
// metadata lives here instead — same pattern as generate/success,
// generate/error, generate/checkout, auth/error.
export const metadata: Metadata = { title: "Saved" };

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
