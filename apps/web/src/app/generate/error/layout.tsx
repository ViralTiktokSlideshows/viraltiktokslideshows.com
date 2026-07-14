import type { Metadata } from "next";

// page.tsx here is a client component ("use client"), so it can't export
// metadata itself — this sibling layout carries it instead. Error/retry
// state, no unique content, not meant to be found via search.
export const metadata: Metadata = {
  title: "Something Went Wrong",
  robots: { index: false, follow: false },
};

export default function GenerateErrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
