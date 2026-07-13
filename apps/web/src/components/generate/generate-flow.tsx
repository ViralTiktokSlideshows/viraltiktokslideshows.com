"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { GenerateShell } from "@/components/dashboard/generate-shell";

import { ErrorStep } from "./error-step";
import { GeneratingStep } from "./generating-step";
import { IdeaStep } from "./idea-step";
import { RevealStep } from "./reveal-step";
import type { GeneratedSlideshow } from "./types";
import { UnlockStep } from "./unlock-step";

type Step = "idea" | "generating" | "reveal" | "unlock" | "error";

// Single-input flow: type an idea, generate, reveal the hook, unlock for
// $2. No format/vibe picker steps anymore — the whole point of moving this
// into the app shell was to make it as fast as the "type an idea, get a
// slideshow" landing pitch actually promises.
export function GenerateFlow() {
  const searchParams = useSearchParams();
  const initialIdea = searchParams.get("idea") ?? "";

  const [step, setStep] = useState<Step>("idea");
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
          <RevealStep data={slideshow} onNext={() => setStep("unlock")} />
        </div>
      ) : null}

      {step === "unlock" && slideshow ? (
        <div className="flex flex-1 flex-col px-4 py-12 sm:px-6 lg:py-16">
          <UnlockStep data={slideshow} />
        </div>
      ) : null}
    </GenerateShell>
  );
}
