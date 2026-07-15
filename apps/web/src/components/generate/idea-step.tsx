"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Textarea } from "@viraltiktokslideshows/ui/components/textarea";

import { SlideDeck } from "@/components/landing/slide-deck";
import { useSession } from "@/lib/auth-client";

export function IdeaStep({
  initialIdea,
  onSubmit,
}: {
  initialIdea: string;
  onSubmit: (idea: string) => void;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const { user } = useSession();
  const plan = user?.plan;

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!idea.trim()) return;
    onSubmit(idea.trim());
  }

  // Enter submits, Shift+Enter inserts a newline — a textarea doesn't
  // submit its form on Enter by default the way a single-line input did,
  // so this keeps the "Press Enter to generate" caption below true.
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="animate-in fade-in-0 flex flex-1 flex-col duration-500 ease-out">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
        <h1 className="font-display text-base font-bold text-foreground sm:text-lg">
          New slideshow
        </h1>
        <span className="text-xs text-nowrap text-muted-foreground">
          {plan
            ? `${plan.label} · ${Math.max(plan.cap - plan.used, 0)} left this month`
            : "$2 to unlock"}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <div className="scale-75 sm:scale-90">
          <SlideDeck />
        </div>

        <h2 className="mt-2 font-display text-2xl leading-[1.1] font-bold text-balance text-foreground sm:text-4xl">
          Type an idea. Get a viral slideshow.
        </h2>

        {/* Same textarea + wrapper as the homepage hero — one input, styled
            identically, wherever someone types their idea. */}
        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
          <div className="relative rounded-2xl border border-border bg-card p-2 shadow-sm">
            <Textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='What&apos;s your slideshow about? e.g. "why most people fail at saving money"'
              // biome-ignore lint/a11y/noAutofocus: this is the sole purpose of the page
              autoFocus
              className="min-h-[84px] resize-none border-0 bg-transparent p-3 pr-14 text-sm shadow-none focus-visible:ring-0 sm:text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!idea.trim()}
              className="absolute right-4 bottom-4"
              aria-label="Generate slideshow"
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
