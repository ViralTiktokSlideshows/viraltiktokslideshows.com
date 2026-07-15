"use client";

import { useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";

import { ErrorStep } from "@/components/generate/error-step";
import { GeneratingStep } from "@/components/generate/generating-step";
import { IdeaStep } from "@/components/generate/idea-step";
import { RevealStep } from "@/components/generate/reveal-step";
import type { GeneratedSlideshow } from "@/components/generate/types";
import { OnboardingFormatStep } from "@/components/onboarding/onboarding-format-step";
import { OnboardingVibeStep, type Vibe } from "@/components/onboarding/onboarding-vibe-step";
import { type SlideFormat, updateSettings } from "@/lib/settings-client";

// Reached once, right after a user's very first successful sign-in (see
// applyOnboardingRedirect in apps/server/src/index.ts) -- never again after
// that. There's no way to skip this: it *is* the first-slideshow flow, not
// a detour from it -- format, then vibe, then the same idea -> generate ->
// reveal -> unlock steps every other slideshow goes through. Abandoning
// mid-flow (closing the tab) just means picking up at /onboarding again
// next sign-in, same as never having started.
const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

async function completeOnboarding() {
  await fetch(`${SERVER_URL}/api/onboarding/complete`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    // Non-fatal -- worst case they land on /onboarding again next sign-in,
    // which just replays this flow, not a dead end.
  });
}

type Step = "format" | "vibe" | "idea" | "generating" | "error" | "reveal";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("format");
  const [format, setFormat] = useState<SlideFormat | null>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [idea, setIdea] = useState("");
  const [slideshow, setSlideshow] = useState<GeneratedSlideshow | null>(null);

  async function handleIdeaSubmit(value: string) {
    setIdea(value);
    // Both fire before the screen changes: the default-format save has to
    // land before /api/generate reads it server-side (see /api/generate in
    // apps/server/src/index.ts, which always reads user.defaultFormat --
    // flipping to the generating screen first could race it and generate
    // against whatever the default was before this pick). Marking
    // onboarding complete here, same moment "Start my first slideshow"
    // used to, means closing the tab mid-generate doesn't loop someone
    // back through personalization next time.
    await Promise.all([
      completeOnboarding(),
      format ? updateSettings({ defaultFormat: format }).catch(() => {}) : null,
    ]);
    setStep("generating");
  }

  return (
    <div className="flex min-h-svh flex-col bg-background px-4 py-10 sm:px-6 sm:py-16">
      {step === "format" ? (
        <OnboardingFormatStep
          selected={format}
          onSelect={setFormat}
          onNext={() => setStep("vibe")}
        />
      ) : null}

      {step === "vibe" ? (
        <OnboardingVibeStep
          selected={vibe}
          onSelect={setVibe}
          onBack={() => setStep("format")}
          onNext={() => setStep("idea")}
        />
      ) : null}

      {step === "idea" ? (
        <div className="flex flex-1 flex-col">
          <IdeaStep initialIdea={idea} onSubmit={handleIdeaSubmit} />
        </div>
      ) : null}

      {step === "generating" ? (
        <GeneratingStep
          idea={idea}
          formats={format ? [format] : []}
          vibes={vibe ? [vibe] : []}
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
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:py-16">
          <RevealStep data={slideshow} />
        </div>
      ) : null}
    </div>
  );
}
