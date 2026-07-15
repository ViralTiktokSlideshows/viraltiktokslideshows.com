"use client";

import { GraduationCap, Heart, Smile } from "lucide-react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { StepShell } from "@/components/generate/step-shell";

import { SingleSelectCard, type SingleSelectOption } from "./single-select-card";

export type Vibe = "funny" | "relatable" | "educational";

const VIBES: (SingleSelectOption & { value: Vibe })[] = [
  {
    id: "funny",
    value: "funny",
    label: "Funny",
    description: "Punchy and a little unhinged. Written to make people tag a friend.",
    icon: Smile,
  },
  {
    id: "relatable",
    value: "relatable",
    label: "Relatable",
    description: '"It\'s literally me." The everyday-truth angle that racks up saves and shares.',
    icon: Heart,
  },
  {
    id: "educational",
    value: "educational",
    label: "Educational",
    description: "Teach something in 6 slides. Authority content that people follow for.",
    icon: GraduationCap,
  },
];

// Step 2 of onboarding's personalization quiz. Single-select, same as
// OnboardingFormatStep. The chosen vibe rides along in the /api/generate
// and checkout request bodies (see the `vibes` array both already accept)
// but -- same as before this flow existed -- there's no defaultVibe field
// on User and generateSlideshow() doesn't take a vibe param, so this is
// captured for the Purchase snapshot rather than steering the AI prompt.
export function OnboardingVibeStep({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: Vibe | null;
  onSelect: (vibe: Vibe) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepShell onBack={onBack} stepLabel="Step 2 of 2" progress={100}>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          What&apos;s the vibe?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Sets the tone of every line we write.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {VIBES.map((vibe) => (
          <SingleSelectCard
            key={vibe.id}
            option={vibe}
            selected={selected === vibe.value}
            onSelect={() => onSelect(vibe.value)}
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
