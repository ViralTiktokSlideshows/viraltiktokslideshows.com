"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need to sign up to try it?",
    a: (
      <>
        No. Type an idea, see your hook slide. You only create an account when you{" "}
        <span className="text-spark">unlock</span> or{" "}
        <span className="text-riot">subscribe</span>.
      </>
    ),
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
    q: "What happens to unused slideshows?",
    a: "Everything you've generated stays in your dashboard to redownload anytime. Subscription generations don't roll over month to month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel anytime from your dashboard. No lock-in, no retention calls.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            FAQ
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Questions, answered fast
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} className="rounded-2xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-foreground">{item.q}</span>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-2xl",
                      isOpen ? "bg-riot/10 text-riot" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isOpen ? <Minus className="size-3" /> : <Plus className="size-3" />}
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
