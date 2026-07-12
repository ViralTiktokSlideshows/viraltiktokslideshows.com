"use client";

import { Check, Plus, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Input } from "@viraltiktokslideshows/ui/components/input";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

export interface SelectableOption {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  custom?: boolean;
}

export function SelectableCard({
  option,
  selected,
  onToggle,
}: {
  option: SelectableOption;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full min-h-[168px] flex-col items-start justify-between gap-8 rounded-2xl border bg-card p-5 text-left transition-colors",
        selected
          ? "border-riot ring-2 ring-riot/25"
          : "border-border hover:border-brand-muted/60",
      )}
    >
      {selected ? (
        <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-2xl bg-riot text-white">
          <Check className="size-3" />
        </span>
      ) : null}

      {Icon ? (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-2xl",
            selected ? "bg-riot/15 text-riot" : "bg-muted text-brand-muted",
          )}
        >
          <Icon className="size-4.5" />
        </span>
      ) : null}

      <div>
        <h3 className="font-semibold text-foreground">{option.label}</h3>
        {option.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
        ) : null}
      </div>
    </button>
  );
}

export function AddCustomCard({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    setOpen(false);
  }

  if (open) {
    return (
      <div className="flex h-full min-h-[168px] flex-col justify-between gap-3 rounded-2xl border border-dashed border-riot/50 bg-riot/5 p-5">
        <Input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Type your own..."
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={submit}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-brand-muted hover:text-foreground"
    >
      <span className="flex size-9 items-center justify-center rounded-2xl bg-muted">
        <Plus className="size-4" />
      </span>
      <span className="text-sm font-medium">Add your own</span>
    </button>
  );
}
