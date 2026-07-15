"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { env } from "@viraltiktokslideshows/env/web";

import { BrandMark } from "@/components/brand-mark";

// Reached once, right after a user's very first successful sign-in (see
// applyOnboardingRedirect in apps/server/src/index.ts) -- never again after
// that, regardless of which button they click. Both paths mark onboarding
// complete before navigating away, so abandoning mid-generate doesn't loop
// them back here next time they sign in.
const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

async function completeOnboarding() {
  await fetch(`${SERVER_URL}/api/onboarding/complete`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    // Non-fatal -- worst case they see this page again next sign-in, which
    // is a minor annoyance, not a broken flow. Never block navigation on it.
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  async function handleStart() {
    setIsStarting(true);
    await completeOnboarding();
    router.push("/generate");
  }

  async function handleSkip() {
    setIsSkipping(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <BrandMark className="size-7" />
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          viraltiktokslideshows
        </span>
      </Link>

      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/10">
        <Sparkles className="size-6 text-accent" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold text-balance text-foreground sm:text-3xl">
        Let&apos;s make your first slideshow
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Type an idea, get a full slideshow back in seconds. Unlock it for $2, or subscribe for a
        monthly batch if you&apos;re planning to post regularly.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" className="w-full justify-center" disabled={isStarting} onClick={handleStart}>
          {isStarting ? "One sec…" : "Start my first slideshow"}
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full justify-center"
          disabled={isSkipping}
          onClick={handleSkip}
        >
          {isSkipping ? "One sec…" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}
