import type { Metadata } from "next";

// page.tsx here is a client component ("use client"), so it can't export
// metadata itself — this sibling layout carries it instead. Post-payment,
// per-user content — not meant to be found via search.
export const metadata: Metadata = {
  title: "Your Slideshow Is Ready",
  robots: { index: false, follow: false },
};

export default function GenerateSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
