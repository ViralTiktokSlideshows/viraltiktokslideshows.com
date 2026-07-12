import { ArrowUp } from "lucide-react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Textarea } from "@viraltiktokslideshows/ui/components/textarea";

import { SlideDeck } from "./slide-deck";

export function Hero() {
  return (
    <section className="px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-1.5 text-xs font-medium shadow-sm">
          <span className="font-mono font-bold tracking-wide text-spark">NEW</span>
          <span className="text-foreground/80">
            Built from <span className="font-semibold text-foreground">100+ slideshows</span>{" "}
            that already went <span className="text-riot">viral</span>
          </span>
        </span>

        <div className="mt-10 w-full sm:mt-12">
          <SlideDeck />
        </div>

        <h1 className="mt-10 font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance text-foreground sm:mt-12 sm:text-5xl md:text-6xl">
          Turn any idea into a viral TikTok slideshow in 30 seconds
        </h1>

        <p className="mt-5 max-w-xl text-base text-balance text-muted-foreground sm:text-lg">
          Type your idea. Get a scroll-stopping hook, slide-by-slide copy, and ready-to-post
          images. No Canva. No templates. No design skills.
        </p>

        <form className="mt-9 w-full max-w-xl sm:mt-10">
          <div className="relative rounded-2xl border border-border bg-card p-2 shadow-sm">
            <Textarea
              placeholder='What&apos;s your slideshow about? e.g. "why most people fail at saving money"'
              className="min-h-[84px] resize-none border-0 bg-transparent p-3 pr-14 text-sm shadow-none focus-visible:ring-0 sm:text-base"
            />
            <Button
              type="submit"
              size="icon"
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
      </div>
    </section>
  );
}
