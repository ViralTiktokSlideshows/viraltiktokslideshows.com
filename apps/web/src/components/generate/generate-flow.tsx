"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FormatStep } from "./format-step";
import { LoadingStep } from "./loading-step";
import { RevealStep } from "./reveal-step";
import type { GeneratedSlideshow } from "./types";
import { UnlockStep } from "./unlock-step";
import { VibeStep } from "./vibe-step";

type Step = "format" | "vibe" | "loading" | "reveal" | "unlock";

export function GenerateFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idea = searchParams.get("idea") ?? "";

  const [step, setStep] = useState<Step>("format");
  const [formats, setFormats] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [slideshow, setSlideshow] = useState<GeneratedSlideshow | null>(null);

  return (
    <main className="px-4 py-14 sm:px-6 sm:py-20">
      {step === "format" ? (
        <FormatStep
          selected={formats}
          onChange={setFormats}
          onBack={() => router.push("/")}
          onNext={() => setStep("vibe")}
        />
      ) : null}

      {step === "vibe" ? (
        <VibeStep
          selected={vibes}
          onChange={setVibes}
          onBack={() => setStep("format")}
          onNext={() => setStep("loading")}
        />
      ) : null}

      {step === "loading" ? (
        <LoadingStep
          idea={idea}
          formats={formats}
          vibes={vibes}
          onComplete={(data) => {
            setSlideshow(data);
            setStep("reveal");
          }}
        />
      ) : null}

      {step === "reveal" && slideshow ? (
        <RevealStep data={slideshow} onNext={() => setStep("unlock")} />
      ) : null}

      {step === "unlock" && slideshow ? <UnlockStep data={slideshow} /> : null}
    </main>
  );
}
