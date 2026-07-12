"use client";

import { GraduationCap, Heart, Smile } from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { AddCustomCard, SelectableCard, type SelectableOption } from "./selectable-card";
import { StepShell } from "./step-shell";

const BASE_VIBES: SelectableOption[] = [
  {
    id: "funny",
    label: "Funny",
    description: "Punchy and a little unhinged. Written to make people tag a friend.",
    icon: Smile,
  },
  {
    id: "relatable",
    label: "Relatable",
    description: '"It\'s literally me." The everyday-truth angle that racks up saves and shares.',
    icon: Heart,
  },
  {
    id: "educational",
    label: "Educational",
    description: "Teach something in 6 slides. Authority content that people follow for.",
    icon: GraduationCap,
  },
];

export function VibeStep({
  selected,
  onChange,
  onBack,
  onNext,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [customOptions, setCustomOptions] = useState<SelectableOption[]>([]);
  const options = [...BASE_VIBES, ...customOptions];

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }

  function addCustom(label: string) {
    const id = `custom-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setCustomOptions((prev) => [...prev, { id, label, custom: true }]);
    onChange([...selected, id]);
  }

  return (
    <StepShell onBack={onBack} stepLabel="Step 2 of 2" progress={100}>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          What&apos;s the vibe?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Tap all that fit &mdash; it sets the tone of every line we write.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {options.map((option) => (
          <SelectableCard
            key={option.id}
            option={option}
            selected={selected.includes(option.id)}
            onToggle={() => toggle(option.id)}
          />
        ))}
        <AddCustomCard onAdd={addCustom} />
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Button type="button" size="lg" disabled={selected.length === 0} onClick={onNext}>
          Next
        </Button>
      </div>
    </StepShell>
  );
}
