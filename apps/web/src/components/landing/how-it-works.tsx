import { Download, PenLine, Sparkles } from "lucide-react";

import { ScreenshotPlaceholder } from "./screenshot-placeholder";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-1 text-[11px] font-semibold tracking-wide text-spark uppercase">
            <span className="size-1.5 rounded-full bg-spark" />
            How it works
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Idea in. Slideshow out.
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            From a single sentence to a post-ready slideshow &mdash; with no design step in
            between.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3 md:items-center">
          <div className="flex h-full flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-6">
            <span className="font-display text-4xl font-bold text-border">01</span>
            <div>
              <span className="mb-4 flex size-9 items-center justify-center rounded-2xl bg-spark/10 text-spark">
                <PenLine className="size-4" />
              </span>
              <h3 className="font-semibold text-foreground">Drop your idea</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                One sentence, plus a format and a vibe.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-md md:-my-4 md:py-8">
            <ScreenshotPlaceholder label="App screenshot — AI writing your slides" />
            <div>
              <span className="mb-4 flex size-9 items-center justify-center rounded-2xl bg-riot/10 text-riot">
                <Sparkles className="size-4" />
              </span>
              <h3 className="font-semibold text-foreground">We write the viral part</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                AI trained on what actually performs writes your hook slide and every slide after
                it: the <span className="text-spark">curiosity gap</span>, the{" "}
                <span className="text-riot">payoff structure</span>, the save-worthy ending.
              </p>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-6">
            <span className="font-display text-4xl font-bold text-border">03</span>
            <div>
              <span className="mb-4 flex size-9 items-center justify-center rounded-2xl bg-void text-bone">
                <Download className="size-4" />
              </span>
              <h3 className="font-semibold text-foreground">Post it</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Download TikTok-ready 1080&times;1920 images and go.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
