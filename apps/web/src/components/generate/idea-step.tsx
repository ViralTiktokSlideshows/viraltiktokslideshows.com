"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { SlideDeck } from "@/components/landing/slide-deck";
import { useMonthlyUsage } from "@/lib/purchases-client";

export function IdeaStep({
  initialIdea,
  onSubmit,
}: {
  initialIdea: string;
  onSubmit: (idea: string) => void;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const usage = useMonthlyUsage();

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!idea.trim()) return;
    onSubmit(idea.trim());
  }

  return (
    <div className="animate-in fade-in-0 flex flex-1 flex-col duration-500 ease-out">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
        <h1 className="font-display text-base font-bold text-foreground sm:text-lg">
          New slideshow
        </h1>
        <span className="text-xs text-nowrap text-muted-foreground">
          Free plan · {Math.max(usage.cap - usage.used, 0)} left this month
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <div className="scale-75 sm:scale-90">
          <SlideDeck />
        </div>

        <h2 className="mt-2 font-display text-2xl leading-[1.1] font-bold text-balance text-foreground sm:text-4xl">
          Type an idea. Get a viral slideshow.
        </h2>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm">
            <input
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="why most people fail at saving money"
              // biome-ignore lint/a11y/noAutofocus: this is the sole purpose of the page
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-base"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-2xl"
              disabled={!idea.trim()}
              aria-label="Generate"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Press Enter to generate · free · takes about 4 seconds
          </p>
        </form>
      </div>
    </div>
  );
}
