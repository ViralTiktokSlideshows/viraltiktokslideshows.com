import type { Metadata } from "next";

// page.tsx here is a client component ("use client", it calls
// subscribeToPlan() and manages loading/error state), so it can't export
// metadata itself — this sibling layout carries it instead. Reached mid-flow,
// not a primary landing destination, and its pricing content overlaps the
// homepage's Pricing section — noindex to avoid diluting authority with a
// thin/duplicate page.
export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: true },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
