import { ArrowRight, Star } from "lucide-react";

const THUMBS = [
  { seed: "vts-thumb-1", label: "You're saving wrong" },
  { seed: "vts-thumb-2", label: null },
  { seed: "vts-thumb-3", label: null },
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
        <div className="flex flex-col items-center text-center">
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
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="w-full sm:max-w-[220px]">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Your idea
              </span>
              <div className="mt-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground">
                &quot;why most people fail at saving money&quot;
              </div>
            </div>

            <ArrowRight className="hidden size-5 shrink-0 text-brand-muted sm:block" />

            <div className="w-full sm:max-w-[300px]">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Finished 7-slide slideshow
              </span>
              <div className="mt-2 flex gap-2">
                {THUMBS.map((thumb) => (
                  <div
                    key={thumb.seed}
                    className="relative aspect-9/16 flex-1 overflow-hidden rounded-2xl border border-border/70"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://picsum.photos/seed/${thumb.seed}/200/356`}
                      alt=""
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-void/35" />
                    {thumb.label ? (
                      <span className="absolute inset-x-1 bottom-1 font-display text-[9px] leading-tight font-semibold text-white">
                        {thumb.label}
                      </span>
                    ) : null}
                    {thumb.more ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-void/60 text-xs font-semibold text-white">
                        +{thumb.more}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col justify-center rounded-2xl bg-void px-6 py-8">
            <span className="font-mono text-3xl font-bold text-spark">4,217</span>
            <span className="mt-1 text-sm text-bone/60">slideshows generated and counting</span>
          </div>
          {TESTIMONIALS.map((quote) => (
            <div
              key={quote}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex gap-0.5 text-spark">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground/80 italic">&ldquo;{quote}&rdquo;</p>
              <p className="mt-4 text-xs text-muted-foreground">@creator &middot; placeholder</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
