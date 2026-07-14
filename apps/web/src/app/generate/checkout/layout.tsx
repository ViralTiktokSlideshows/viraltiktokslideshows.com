import type { Metadata } from "next";

// page.tsx here is a client component ("use client"), so it can't export
// metadata itself — this sibling layout carries it instead. Auth + payment
// step reached mid-flow, not a landing destination — noindex.
export const metadata: Metadata = {
  title: "Sign In & Pay",
  robots: { index: false, follow: false },
};

export default function GenerateCheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
