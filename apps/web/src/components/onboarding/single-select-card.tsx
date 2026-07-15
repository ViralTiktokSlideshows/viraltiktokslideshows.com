"use client";

import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@viraltiktokslideshows/ui/lib/utils";

export interface SingleSelectOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

// Single-select variant of the old (deleted) generate-flow SelectableCard --
// onboarding's Format/Vibe steps ask for exactly one answer each (they map
// straight onto SlideFormat, a single-valued enum, and the "what's the
// vibe" question is framed the same way), so there's no toggle/multi-select
// or "add your own" affordance here, just a plain single-choice card.
export function SingleSelectCard({
  option,
  selected,
  onSelect,
}: {
  option: SingleSelectOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full min-h-[168px] flex-col items-start justify-between gap-8 rounded-2xl border bg-card p-5 text-left transition-all duration-200 active:scale-[0.98]",
        selected
          ? "border-riot shadow-sm ring-2 ring-riot/25"
          : "border-border hover:-translate-y-0.5 hover:border-brand-muted/60 hover:shadow-sm",
      )}
    >
      {selected ? (
        <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-2xl bg-riot text-white">
          <Check className="size-3" />
        </span>
      ) : null}

      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-2xl",
          selected ? "bg-riot/15 text-riot" : "bg-muted text-brand-muted",
        )}
      >
        <Icon className="size-4.5" />
      </span>

      <div>
        <h3 className="font-semibold text-foreground">{option.label}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
      </div>
    </button>
  );
}
