"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

export function ErrorStep({
  onRetry,
  onEditIdea,
}: {
  onRetry: () => void;
  onEditIdea: () => void;
}) {
  return (
    <div className="animate-in fade-in-0 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center duration-500 ease-out sm:px-6">
      <div className="relative h-28 w-24">
        <div className="absolute inset-0 -rotate-6 rounded-2xl border border-border bg-muted/60" />
        <div className="absolute inset-0 rotate-3 rounded-2xl border border-border bg-muted/60" />
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
          <RotateCw className="size-5 text-spark" />
        </div>
      </div>

      <h2 className="mt-6 font-display text-2xl font-bold text-foreground sm:text-3xl">
        That deck didn&apos;t come together
      </h2>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        A hiccup on our end while writing your slides —{" "}
        <span className="font-medium text-foreground">your credit wasn&apos;t touched.</span> Give
        it another run; these almost always land the second time.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" className="gap-2" onClick={onRetry}>
          <RotateCw className="size-4" data-icon="inline-start" />
          Regenerate
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onEditIdea}>
          Edit idea
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Keeps happening?{" "}
        <a href="mailto:support@viraltiktokslideshows.com" className="text-riot hover:underline">
          Ping us
        </a>
      </p>
    </div>
  );
}
