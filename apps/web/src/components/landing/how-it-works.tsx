"use client";

import { Download, PenLine, Sparkles } from "lucide-react";
import { useState } from "react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { Reveal } from "@/components/reveal";

import { ScreenshotPlaceholder } from "./screenshot-placeholder";

const STEPS = [
  {
    id: "drop",
    number: "01",
    icon: PenLine,
    iconBg: "bg-spark/10 text-spark",
    title: "Drop your idea",
    description: "One sentence, plus a format and a vibe.",
    imageLabel: "App screenshot — typing your idea",
  },
  {
    id: "write",
    number: "02",
    icon: Sparkles,
    iconBg: "bg-riot/10 text-riot",
    title: "We write the viral part",
    description: (
      <>
        AI trained on what actually performs writes your hook slide and every slide after it: the{" "}
        <span className="text-spark">curiosity gap</span>, the{" "}
        <span className="text-riot">payoff structure</span>, the save-worthy ending.
      </>
    ),
    imageLabel: "App screenshot — AI writing your slides",
  },
  {
    id: "post",
    number: "03",
    icon: Download,
    iconBg: "bg-void text-bone",
    title: "Post it",
    description: "Download TikTok-ready 1080×1920 images and go.",
    imageLabel: "App screenshot — downloading your slides",
  },
] as const;

export function HowItWorks() {
  const [activeId, setActiveId] = useState<string>("write");

  return (
    <section id="how-it-works" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="flex flex-col items-center text-center">
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
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3 md:items-start">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const active = activeId === step.id;

            return (
              <Reveal key={step.id} delay={index * 100}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveId(step.id)}
                  onFocus={() => setActiveId(step.id)}
                  onClick={() => setActiveId(step.id)}
                  className={cn(
                    "flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300",
                    active ? "-translate-y-1 shadow-lg" : "shadow-none",
                  )}
                >
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <ScreenshotPlaceholder label={step.imageLabel} className="mb-5" />
                    </div>
                  </div>

                  {!active ? (
                    <span className="font-display text-4xl font-bold text-border">
                      {step.number}
                    </span>
                  ) : null}

                  <div>
                    <span
                      className={cn(
                        "mb-4 flex size-9 items-center justify-center rounded-2xl",
                        step.iconBg,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
