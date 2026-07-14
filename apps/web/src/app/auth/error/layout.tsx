import type { Metadata } from "next";

// page.tsx here is a client component ("use client"), so it can't export
// metadata itself — this sibling layout carries it instead. Error state,
// no unique content — noindex.
export const metadata: Metadata = {
  title: "Sign-In Error",
  robots: { index: false, follow: false },
};

export default function AuthErrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
