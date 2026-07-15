import type { Metadata } from "next";

// page.tsx here is a client component ("use client"), so it can't export
// metadata itself — this sibling layout carries it instead. Only ever
// reached right after a first sign-in, not a landing destination — noindex.
export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
