import { Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { GenerateShell } from "@/components/dashboard/generate-shell";

// Reached mid-flow, not a primary landing destination, and its pricing
// content overlaps the homepage's Pricing section — noindex to avoid
// diluting authority with a thin/duplicate page.
export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: true },
};

// Visual only for now: there's no Dodo subscription product or credits
// backend behind these plans yet, so the monthly tiers are intentionally
// disabled rather than faking a checkout. The $2 single-slideshow link at
// the bottom is real — it's the same unlock flow already wired end to end.
export default function UpgradePage() {
  return (
    <GenerateShell>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/10">
          <Zap className="size-5 text-accent" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-balance text-foreground sm:text-3xl">
          Get more slideshows every month
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Subscribe for a monthly batch of unlocked slideshows instead of paying $2 each time.
        </p>

        <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <div className="relative rounded-2xl border-2 border-void bg-void p-5 text-left text-bone">
            <span className="absolute -top-2.5 right-5 rounded-2xl bg-spark px-2 py-0.5 text-[10px] font-semibold tracking-widest text-void uppercase">
              Recommended
            </span>
            <p className="text-sm font-semibold">Pro</p>
            <p className="mt-2 font-display text-2xl font-bold">
              $59.99<span className="text-sm font-normal text-bone/60">/mo</span>
            </p>
            <p className="mt-1 text-xs text-bone/60">60 slideshows / month</p>
            <Button
              className="mt-4 w-full justify-center"
              disabled
              title="Subscriptions aren't set up yet — email us if you want in early"
            >
              Upgrade to Pro
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-left">
            <p className="text-sm font-semibold text-foreground">Agency</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              $199.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">200 slideshows / month</p>
            <Button
              variant="outline"
              className="mt-4 w-full justify-center"
              disabled
              title="Subscriptions aren't set up yet — email us if you want in early"
            >
              Upgrade to Agency
         