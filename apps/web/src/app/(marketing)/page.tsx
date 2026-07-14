import type { Metadata } from "next";

import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Playbook } from "@/components/landing/playbook";
import { Pricing } from "@/components/landing/pricing";
import { ProductScreenshot } from "@/components/landing/product-screenshot";
import { QuoteBand } from "@/components/landing/quote-band";

export const metadata: Metadata = {
  title: "Turn Any Idea Into a Viral TikTok Slideshow",
  description:
    "Type an idea, see your hook slide free, and unlock the full deck for $2. AI-written slides, real background images, ready to post in about 30 seconds — no design skills needed.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Turn Any Idea Into a Viral TikTok Slideshow",
    description:
      "Type an idea, see your hook slide free, and unlock the full deck for $2. AI-written slides, real background images, ready to post in about 30 seconds.",
  },
};

// Basic Product/SoftwareApplication structured data — gives search engines
// (and AI answer engines) a clean, unambiguous read on what this is, what
// it costs, and what category it's in, rather than inferring from prose.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Viral TikTok Slideshows",
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web-based)",
  description:
    "Turn a single idea into a post-ready, viral TikTok slideshow — hook, slides, and images generated in about 30 seconds.",
  url: "https://viraltiktokslideshows.com",
  offers: {
    "@type": "Offer",
    price: "2.00",
    priceCurrency: "USD",
    description: "One-time unlock for a full generated slideshow (hook slide preview is free).",
  },
};

export default function Home() {
  return (
    <main>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, hand-authored JSON-LD, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <Hero />
      <QuoteBand />
      <ProductScreenshot />
      <HowItWorks />
      <Playbook />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
