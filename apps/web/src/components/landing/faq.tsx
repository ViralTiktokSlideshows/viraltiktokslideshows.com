"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { Reveal } from "@/components/reveal";

// Plain strings (not JSX) so the same array can drive both the visible
// accordion and the FAQPage structured data below without the two ever
// drifting out of sync.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need to sign up to try it?",
    a: "No. Type an idea, see your hook slide instantly. You only create an account when you're ready to unlock the full slideshow for $2.",
  },
  {
    q: "What do I actually get?",
    a: "A hook slide plus 6–7 follow-up slides, written and designed for you, delivered as TikTok-ready 1080×1920 PNGs you can download and post right away.",
  },
  {
    q: "Can I edit the slides?",
    a: "Not in the MVP — the product's value is speed and hook quality, not design flexibility. If a hook doesn't land, regenerate it instead of editing it by hand.",
  },
  {
    q: "Does this work for Instagram carousels too?",
    a: "Slides export at 1080×1920, which works well for Reels and Stories. We're not optimizing for the square 1:1 format Instagram carousels traditionally use.",
  },
  {
    q: "Do my slideshows expire?",
    a: "No — everything you generate stays in your dashboard so you can redownload it anytime. Free previews you didn't unlock can be regenerated for a fresh take whenever you want.",
  },
  {
    q: "Is there a subscription?",
    a: "Not right now — it's pay-per-slideshow: $2 to unlock, no recurring charge, nothing to cancel. If you need volume regularly, email us.",
  },
];

const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-16 sm:px-6 sm:py-20">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, hand-authored JSON-LD, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_STRUCTURED_DATA) }}
      />
      <div className="mx-auto max-w-2xl">
        <Reveal className="flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            FAQ
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Questions, answered fast
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-10 flex flex-col gap-3">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-border bg-card transition-shadow duration-200 hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-foreground">{item.q}</span>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200",
                      isOpen ? "bg-riot/10 text-riot" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isOpen ? <Minus className="size-3" /> : <Plus className="size-3" />}
                  </span>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
