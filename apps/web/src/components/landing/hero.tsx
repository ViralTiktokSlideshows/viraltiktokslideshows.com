"use client";

import { ArrowUp } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Textarea } from "@viraltiktokslideshows/ui/components/textarea";

import { Reveal } from "@/components/reveal";

import { SlideDeck } from "./slide-deck";

export function Hero() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = idea.trim();
    if (!trimmed) return;
    router.push(`/generate?idea=${encodeURIComponent(trimmed)}` as Route);
  }

  return (
    <section className="px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-1.5 text-xs font-medium shadow-sm">
            <span className="font-mono font-bold tracking-wide text-spark">NEW</span>
            <span className="text-foreground/80">
              Built from <span className="font-semibold text-foreground">100+ slideshows</span>{" "}
              that already went <span className="text-riot">viral</span>
            </span>
          </span>
        </Reveal>

        <Reveal delay={100} className="mt-10 w-full sm:mt-12">
          <SlideDeck />
        </Reveal>

        <Reveal delay={180}>
          <h1 className="mt-10 font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance text-foreground sm:mt-12 sm:text-5xl md:text-6xl">
            Turn any idea into a viral TikTok slideshow in 30 seconds
          </h1>
        </Reveal>

        <Reveal delay={260}>
          <p className="mt-5 max-w-xl text-base text-balance text-muted-foreground sm:text-lg">
            Type your idea. Get a scroll-stopping hook, slide-by-slide copy, and ready-to-post
            images. No Canva. No templates. No design skills.
          </p>
        </Reveal>

        <Reveal delay={340} className="w-full max-w-xl">
          <form className="mt-9 w-full sm:mt-10" onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-border bg-card p-2 shadow-sm">
              <Textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder='What&apos;s your slideshow about? e.g. "why most people fail at saving money"'
                className="min-h-[84px] resize-none border-0 bg-transparent p-3 pr-14 text-sm shadow-none focus-visible:ring-0 sm:text-base"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!idea.trim()}
                className="absolute right-4 bottom-4"
                aria-label="Generate slideshow"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No signup &middot; No credit card &middot; See your first slide instantly
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
