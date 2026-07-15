import type { Metadata } from "next";
import { Suspense } from "react";

import { GenerateFlow } from "@/components/generate/generate-flow";

export const metadata: Metadata = {
  title: "Generate a Slideshow",
  description:
    "Type an idea and get a viral-ready TikTok slideshow in about 30 seconds — see your hook slide free, unlock the full deck for $2.",
  alternates: { canonical: "/generate" },
  openGraph: {
    url: "/generate",
    title: "Generate a Viral TikTok Slideshow",
    description: "Type an idea, get a viral-ready slideshow in about 30 seconds. Free preview.",
  },
};

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateFlow />
    </Suspense>
  );
}
