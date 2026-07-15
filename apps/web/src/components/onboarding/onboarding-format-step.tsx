"use client";

import { AlignLeft, ListChecks, Zap } from "lucide-react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { StepShell } from "@/components/generate/step-shell";
import type { SlideFormat } from "@/lib/settings-client";

import { SingleSelectCard, type SingleSelectOption } from "./single-select-card";

const FORMATS: (SingleSelectOption & { value: SlideFormat })[] = [
  {
    id: "storytime",
    value: "STORYTIME",
    label: "Storytime",
    description: "A personal arc — hook, tension, payoff. Feels like a friend telling you a secret.",
    icon: AlignLeft,
  },
  {
    id: "listicle",
    value: "LISTICLE",
    label: "Listicle",
    description: "Ranked or numbered. Built for saves — people screenshot the good ones.",
    icon: ListChecks,
  },
  {
    id: "hot-take",
    value: "HOT_TAKE",
    label: "Hot Take",
    description: "One bold opinion, defended hard. Drives comments and quote-shares.",
    icon: Zap,
  },
];

// Step 1 of onboarding's 2-step personalization quiz -- single-select,
// unlike the old (deleted) multi-select generate-flow FormatStep, since
// this maps straight onto SlideFormat, a single-valued field. Selecting a
// card is the only way to select it: there's no separate "confirm" click
// needed to advance beyond clicking Next.
export function OnboardingFormatStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: SlideFormat | null;
  onSelect: (format: SlideFormat) => void;
  onNext: () => void;
}) {
  return (
    <StepShell stepLabel="Step 1 of 2" progress={50}>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          What kind of slideshow?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Tap one — it changes how yours is written.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {FORMATS.map((format) => (
          <SingleSelectCard
            key={format.id}
            option={format}
            selected={selected === format.value}
            onSelect={() => onSelect(format.value)}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button type="button" size="lg" disabled={!selected} onClick={onNext}>
          Next
        </Button>
      </div>
    </StepShell>
  );
}
