"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { GenerateShell } from "@/components/dashboard/generate-shell";

import { ErrorStep } from "./error-step";
import { GeneratingStep } from "./generating-step";
import { IdeaStep } from "./idea-step";
import { RevealStep } from "./reveal-step";
import type { GeneratedSlideshow } from "./types";

type Step = "idea" | "generating" | "reveal" | "error";

// Single-input flow: type an idea, generate, reveal the hook, try for $2.
// No format/vibe picker steps, and no separate "here's what unlocking
// costs" screen either — RevealStep's CTA runs the checkout logic
// directly. Arriving here with a prefilled idea (from the homepage hero)
// skips the idea step entirely and starts generating immediately, so
// "type an idea, get a slideshow" is actually one click, not two.
export function GenerateFlow() {
  const searchParams = useSearchParams();
  const initialIdea = searchParams.get("idea") ?? "";

  const [step, setStep] = useState<Step>(initialIdea ? "generating" : "idea");
  const [idea, setIdea] = useState(initialIdea);
  const [slideshow, setSlideshow] = useState<GeneratedSlideshow | null>(null);

  return (
    <GenerateShell>
      {step === "idea" ? (
        <IdeaStep
          initialIdea={idea}
          onSubmit={(value) => {
            setIdea(value);
            setStep("generating");
          }}
        />
      ) : null}

      {step === "generating" ? (
        <GeneratingStep
          idea={idea}
          onComplete={(data) => {
            setSlideshow(data);
            setStep("reveal");
          }}
          onError={() => setStep("error")}
        />
      ) : null}

      {step === "error" ? (
        <ErrorStep onRetry={() => setStep("generating")} onEditIdea={() => setStep("idea")} />
      ) : null}

      {step === "reveal" && slideshow ? (
        <div className="flex flex-1 flex-col px-4 py-12 sm:px-6 lg:py-16">
          <RevealStep data={slideshow} />
        </div>
      ) : null}
    </GenerateShell>
  );
}
