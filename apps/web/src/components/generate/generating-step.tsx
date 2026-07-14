"use client";

import { useEffect, useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { TurnstileWidget } from "@/components/turnstile-widget";

import type { GeneratedSlideshow } from "./types";

const TIPS = [
  "Most viral slideshows are 6–8 slides. We're building yours to match.",
  "You just saved yourself about 30 minutes in Canva.",
  "The best hooks promise a payoff, not just curiosity.",
  "Slide 1 gets about 0.5 seconds to earn slide 2.",
  "Question hooks and bold claims consistently outperform generic openers.",
  "Slideshows with a strong hook slide get ~3x more saves.",
];

export function GeneratingStep({
  idea,
  onComplete,
  onError,
}: {
  idea: string;
  onComplete: (data: GeneratedSlideshow) => void;
  onError: () => void;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [progress, setProgress] = useState(6);
  // Gates the actual request — nothing fires until Turnstile hands back a
  // token. This component unmounts/remounts on every "generating" step
  // entry (including retries from ErrorStep), so a fresh token is always
  // obtained rather than reusing a single-use, already-spent one.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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
    if (!turnstileToken) return;

    let cancelled = false;
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev));
    }, 400);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 2200));
    const request = fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, formats: [], vibes: [], turnstileToken }),
    }).then((res) => {
      if (!res.ok) throw new Error("Generate request failed");
      return res.json() as Promise<GeneratedSlideshow>;
    });

    Promise.all([request, minDelay])
      .then(([data]) => {
        if (cancelled) return;
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          if (!cancelled) onComplete(data);
        }, 350);
      })
      .catch(() => {
        if (cancelled) return;
        clearInterval(progressInterval);
        onError();
      });

    return () => {
      cancelled = true;
      clearInterval(progressInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileToken]);

  return (
    <div className="animate-in fade-in-0 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center duration-500 ease-out sm:px-6">
      <div className="relative h-40 w-32">
        <div className="absolute inset-2 rounded-2xl bg-border" />
        <div className="absolute inset-0 animate-pulse rounded-2xl border border-border bg-gradient-to-br from-spark/40 via-spark/15 to-transparent shadow-lg" />
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

      <p className="mt-4 max-w-xs truncate text-xs text-muted-foreground">{idea}</p>

      <TurnstileWidget onVerify={setTurnstileToken} className="mt-4" />
    </div>
  );
}
