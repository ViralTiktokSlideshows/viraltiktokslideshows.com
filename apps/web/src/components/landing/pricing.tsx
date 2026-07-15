import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { Reveal } from "@/components/reveal";

import { PlanCTA } from "./plan-cta";

const PLANS = [
  {
    tier: "CREATOR",
    name: "Creator",
    price: "$19.99",
    quota: "20 slideshows per month.",
    note: "For anyone posting weekly.",
    featured: false,
  },
  {
    tier: "PRO",
    name: "Pro",
    price: "$59.99",
    quota: "60 slideshows per month.",
    note: "For daily posters and multi-account creators.",
    featured: true,
  },
  {
    tier: "AGENCY",
    name: "Agency",
    price: "$199.99",
    quota: "200 slideshows per month.",
    note: "For teams and operators running volume.",
    featured: false,
  },
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Pricing
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Try it free. Unlock when you love it.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Reveal className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-foreground">Preview</h3>
              <span className="font-mono text-sm font-semibold text-muted-foreground">Free</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              See your hook slide before paying a cent. If the hook doesn&apos;t stop{" "}
              <em>you</em> mid-scroll, don&apos;t buy it.
            </p>
          </Reveal>

          <Reveal
            delay={100}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-void p-6"
          >
            <span className="absolute top-5 right-5 rounded-2xl bg-spark px-2.5 py-1 text-[10px] font-bold tracking-wide text-void uppercase">
              Start here
            </span>
            <div>
              <h3 className="font-semibold text-bone">Single unlock</h3>
              <p className="mt-1 font-mono text-3xl font-bold text-spark">$2</p>
              <p className="mt-3 max-w-xs text-sm text-bone/60">
                Unlock this slideshow. All slides, full quality, no watermark. Yours forever.
              </p>
            </div>
            <Button
              className="mt-6 w-full"
              nativeButton={false}
              render={<Link href="/generate" />}
            >
              Generate my slideshow &mdash; free
            </Button>
          </Reveal>
        </div>

        <p className="mt-8 text-center text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Or subscribe for volume
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal
              key={plan.name}
              delay={index * 100}
              className={
                plan.featured
                  ? "relative flex flex-col gap-4 rounded-2xl bg-void p-6 shadow-xl sm:-my-3 sm:py-9"
                  : "flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
              }
            >
              {plan.featured ? (
                <span className="absolute top-5 right-5 rounded-2xl bg-riot px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                  Most popular
                </span>
              ) : null}
              <h3 className={plan.featured ? "font-semibold text-bone" : "font-semibold text-foreground"}>
                {plan.name}
              </h3>
              <p>
                <span
                  className={
                    plan.featured
                      ? "font-mono text-3xl font-bold text-spark"
                      : "font-mono text-3xl font-bold text-foreground"
                  }
                >
                  {plan.price}
                </span>
                <span
                  className={plan.featured ? "text-sm text-bone/50" : "text-sm text-muted-foreground"}
                >
                  /mo
                </span>
              </p>
              <div>
                <p className={plan.featured ? "text-sm text-bone/80" : "text-sm text-foreground/80"}>
                  {plan.quota}
                </p>
                <p
                  className={
                    plan.featured
                      ? "mt-1 text-xs text-bone/50"
                      : "mt-1 text-xs text-muted-foreground"
                  }
                >
                  {plan.note}
                </p>
              </div>
              <PlanCTA tier={plan.tier} featured={plan.featured} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
