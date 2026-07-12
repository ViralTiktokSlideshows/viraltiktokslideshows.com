"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { StepShell } from "./step-shell";
import type { GeneratedSlideshow } from "./types";

export function UnlockStep({ data }: { data: GeneratedSlideshow }) {
  return (
    <StepShell>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="relative h-[190px] w-[140px] sm:h-[220px] sm:w-[160px]">
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-3 text-left shadow-xl">
            <p className="font-display text-sm leading-tight font-bold text-foreground">
              {data.hook}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-2xl bg-spark" />
          2,417 slideshows generated this week
        </div>

        <Button
          type="button"
          size="lg"
          className="mt-6"
          onClick={() =>
            toast("Checkout isn't wired up yet", {
              description: "DodoPayments integration is coming soon — hang tight.",
            })
          }
        >
          Unlock for $2
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px w-8 bg-border" />
          or subscribe
          <span className="h-px w-8 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-2.5"
          onClick={() =>
            toast("Google sign-in isn't wired up yet", {
              description: "Account creation happens here once checkout ships.",
            })
          }
        >
          <Image src="/icons8-google-48.png" alt="" width={16} height={16} />
          Continue with Google
        </Button>
      </div>
    </StepShell>
  );
}
