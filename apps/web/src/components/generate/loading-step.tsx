"use client";

import { useEffect, useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { StepShell } from "./step-shell";
import { FALLBACK_SLIDESHOW, type GeneratedSlideshow } from "./types";

const TIPS = [
  "Most viral slideshows are 6–8 slides. We're building yours to match.",
  "You just saved yourself about 30 minutes in Canva.",
  "The best hooks promise a payoff, not just curiosity.",
  "Slide 1 gets about 0.5 seconds to earn slide 2.",
  "Question hooks and bold claims consistently outperform generic openers.",
  "Formatting every slide by hand? That's the old way.",
];

export function LoadingStep({
  idea,
  formats,
  vibes,
  onComplete,
}: {
  idea: string;
  formats: string[];
  vibes: string[];
  onComplete: (data: GeneratedSlideshow) => void;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
        setTipVisible(true);
      }, 250);
    }, 2400);

    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev));
    }, 400);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 2600));
    const request = fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, formats, vibes }),
    })
      .then((res) => res.json() as Promise<GeneratedSlideshow>)
      .catch(() => FALLBACK_SLIDESHOW);

    Promise.all([request, minDelay]).then(([data]) => {
      if (cancelled) return;
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        if (!cancelled) onComplete(data);
      }, 350);
    });

    return () => {
      cancelled = true;
      clearInterval(progressInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell>
      <div className="flex flex-col items-center py-10 text-center">
        <div className="relative h-40 w-32">
          <div className="absolute inset-2 rounded-2xl bg-border" />
          <div className="absolute inset-0 -rotate-3 rounded-2xl border border-border bg-gradient-to-br from-spark/40 via-spark/15 to-transparent shadow-lg" />
          <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5">
            <div className="h-2 w-3/4 rounded-2xl bg-spark/50" />
            <div className="h-2 w-1/2 rounded-2xl bg-spark/35" />
          </div>
        </div>

        <h2 className="mt-8 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Building your slideshow&hellip;
        </h2>

        <p
          className={cn(
            "mt-3 min-h-5 max-w-sm text-sm text-spark transition-opacity duration-200",
            tipVisible ? "opacity-100" : "opacity-0",
          )}
        >
          {TIPS[tipIndex]}
        </p>

        <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-2xl bg-border">
          <div
            className="h-full rounded-2xl bg-spark transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </StepShell>
  );
}
