"use client";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { StepShell } from "./step-shell";
import type { GeneratedSlideshow } from "./types";

export function RevealStep({
  data,
  onNext,
}: {
  data: GeneratedSlideshow;
  onNext: () => void;
}) {
  const remaining = Math.max(data.slideCount - 1, 0);

  return (
    <StepShell>
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Here&apos;s your hook slide
        </p>

        <div className="relative mt-8 h-[260px] w-[190px] sm:h-[300px] sm:w-[220px]">
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-xl">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Slide 1 / {data.slideCount}
            </span>
            <p className="font-display text-xl leading-tight font-bold text-foreground sm:text-2xl">
              {data.hook}
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {remaining} more slide{remaining === 1 ? "" : "s"} ready behind it
        </p>

        <Button type="button" size="lg" className="mt-8" onClick={onNext}>
          See what it takes to unlock
        </Button>
      </div>
    </StepShell>
  );
}
