"use client";

import { AlignLeft, ListChecks, Zap } from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { AddCustomCard, SelectableCard, type SelectableOption } from "./selectable-card";
import { StepShell } from "./step-shell";

const BASE_FORMATS: SelectableOption[] = [
  {
    id: "storytime",
    label: "Storytime",
    description:
      "A personal arc — hook, tension, payoff. Feels like a friend telling you a secret.",
    icon: AlignLeft,
  },
  {
    id: "listicle",
    label: "Listicle",
    description: "Ranked or numbered. Built for saves — people screenshot the good ones.",
    icon: ListChecks,
  },
  {
    id: "hot-take",
    label: "Hot Take",
    description: "One bold opinion, defended hard. Drives comments and quote-shares.",
    icon: Zap,
  },
];

export function FormatStep({
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
  const options = [...BASE_FORMATS, ...customOptions];

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }

  function addCustom(label: string) {
    const id = `custom-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setCustomOptions((prev) => [...prev, { id, label, custom: true }]);
    onChange([...selected, id]);
  }

  return (
    <StepShell onBack={onBack} stepLabel="Step 1 of 2" progress={50}>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          What kind of slideshow?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Tap all that fit &mdash; it changes how yours is written.
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

      <div className="mt-8 flex justify-center">
        <Button type="button" size="lg" disabled={selected.length === 0} onClick={onNext}>
          Next
        </Button>
      </div>
    </StepShell>
  );
}
