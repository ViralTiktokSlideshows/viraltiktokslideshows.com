"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

export function StepShell({
  onBack,
  stepLabel,
  progress,
  children,
}: {
  onBack?: () => void;
  stepLabel?: string;
  progress?: number;
  children: ReactNode;
}) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 relative mx-auto w-full max-w-3xl duration-500 ease-out">
      {typeof progress === "number" ? (
        <div className="mb-8 h-1 w-full overflow-hidden rounded-2xl bg-border">
          <div
            className="h-full rounded-2xl bg-spark transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {onBack ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back"
          className="mb-6"
        >
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}

      {stepLabel ? (
        <p className="mb-2 text-center text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {stepLabel}
        </p>
      ) : null}

      {children}
    </div>
  );
}
