"use client";

import { Mail, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@viraltiktokslideshows/ui/components/accordion";
import { Button } from "@viraltiktokslideshows/ui/components/button";

const FAQ_ITEMS = [
  {
    question: "How do I download my slideshow?",
    answer:
      "Once you unlock a slideshow for $2, a Download button appears on that slideshow's page — it zips up every slide as a PNG. You can also get there anytime from My slideshows in your dashboard.",
  },
  {
    question: "Can I edit the slides after generating?",
    answer:
      "Not yet — the app is built for speed, so you pick an idea and we handle the writing and design. Regenerating is faster than editing, and it's free if a generation fails.",
  },
  {
    question: "Do I need an account to try it?",
    answer:
      "No — generating your free hook slide doesn't require signing in. You'll only need an account when you're ready to unlock the full deck.",
  },
  {
    question: "How much does it cost?",
    answer:
      "The hook slide is free to preview. Unlocking the full slideshow — every slide, plus download — is a one-time $2 payment. There's no subscription to manage or cancel.",
  },
  {
    question: "Do the slides work for Instagram carousels?",
    answer:
      "Yes — slides export as individual, vertically-sized PNGs, which works for TikTok slideshows, Instagram carousels, and Reels-style posts alike.",
  },
  {
    question: "Why did my generation fail?",
    answer:
      "Occasionally the AI writing or image step times out upstream. It's free to retry — just hit Try again from My slideshows, or start a new one from Generate.",
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
        How can we help?
      </h1>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search help articles..."
          className="w-full rounded-2xl border border-border bg-card py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Common questions
          </p>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo; — try a different search, or email us below.
            </p>
          ) : (
            <Accordion className="mt-2 rounded-2xl border border-border bg-card px-4">
              {filtered.map((item) => (
                <AccordionItem key={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionPanel>{item.answer}</AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-void p-5 text-bone">
            <p className="font-display text-sm font-bold">Still stuck?</p>
            <p className="mt-2 text-xs text-bone/70">
              Email us and we&apos;ll get back to you within a few hours.
            </p>
            <Button
              className="mt-4 w-full justify-center gap-1.5 bg-spark text-primary-foreground hover:bg-spark/90"
              nativeButton={false}
              render={<a href="mailto:support@viraltiktokslideshows.com" />}
            >
              <Mail className="size-4" data-icon="inline-start" />
              Contact support
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-foreground hover:underline"
            >
              The viral playbook
            </Link>
            <div className="mt-3 flex gap-2">
              <a
                href="#"
                aria-label="TikTok"
                className="flex size-8 items-center justify-center rounded-2xl border border-border transition-colors hover:border-brand-muted"
              >
                <Image src="/icons8-tiktok-48.png" alt="" width={16} height={16} />
              </a>
              <a
                href="#"
                aria-label="X"
                className="flex size-8 items-center justify-center rounded-2xl border border-border transition-colors hover:border-brand-muted"
              >
                <Image src="/icons8-x-50.png" alt="" width={16} height={16} />
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Typical reply: under a few hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
