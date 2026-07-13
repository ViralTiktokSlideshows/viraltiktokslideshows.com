import { ArrowDown, Quote, Star } from "lucide-react";

import { Reveal } from "@/components/reveal";

const THUMBS = [
  { seed: "vts-thumb-1", label: "You're saving wrong", more: null },
  { seed: "vts-thumb-2", label: null, more: null },
  { seed: "vts-thumb-3", label: null, more: null },
  { seed: "vts-thumb-4", label: null, more: 4 },
] as const;

const TESTIMONIALS = [
  "Testimonial goes here once creators start sharing results.",
  "Second social-proof quote — swap in a real one when available.",
];

export function Playbook() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            The playbook
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Built from what already went viral
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            We analyzed 100+ viral TikTok slideshows to find what they all got right &mdash; hook
            structure, slide count, text placement, payoff timing. Every slideshow you generate
            follows that playbook automatically.
          </p>
        </Reveal>

        <Reveal
          delay={100}
          className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-spark/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full bg-riot/10 blur-3xl"
          />

          <div className="relative flex flex-col items-center">
            <div className="w-full max-w-sm">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Your idea
              </span>
              <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-border bg-muted/40 px-4 py-3.5 text-sm text-foreground shadow-sm">
                <Quote className="mt-0.5 size-3.5 shrink-0 text-brand-muted" />
                <span>why most people fail at saving money</span>
              </div>
            </div>

            <span className="my-5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-spark/10 text-spark">
              <ArrowDown className="size-4" />
            </span>

            <div className="w-full text-center">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Finished 7-slide slideshow
              </span>
              <div className="mt-5 flex flex-wrap justify-center gap-4 sm:gap-5">
                {THUMBS.map((thumb, index) => (
                  <div
                    key={thumb.seed}
                    className="group relative aspect-9/16 w-[130px] shrink-0 overflow-hidden rounded-2xl border border-border/70 shadow-lg transition-transform duration-200 hover:-translate-y-1.5 hover:rotate-0 sm:w-[172px]"
                    style={{ transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://picsum.photos/seed/${thumb.seed}/400/711`}
                      alt=""
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-void/10 to-transparent" />
                    {thumb.label ? (
                      <span className="absolute inset-x-3 bottom-3 font-display text-base leading-tight font-semibold text-white sm:text-lg">
                        {thumb.label}
                      </span>
                    ) : null}
                    {thumb.more ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-void/70 text-2xl font-bold text-white backdrop-blur-[2px]">
                        +{thumb.more}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <Reveal className="flex flex-col justify-center rounded-2xl bg-void px-6 py-8">
            <span className="font-mono text-3xl font-bold text-spark">4,217</span>
            <span className="mt-1 text-sm text-bone/60">slideshows generated and counting</span>
          </Reveal>
          {TESTIMONIALS.map((quote, index) => (
            <Reveal
              key={quote}
              delay={(index + 1) * 100}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex gap-0.5 text-spark">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground/80 italic">&ldquo;{quote}&rdquo;</p>
              <p className="mt-4 text-xs text-muted-foreground">@creator &middot; placeholder</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
