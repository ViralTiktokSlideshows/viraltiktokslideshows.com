"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { useSession } from "@/lib/auth-client";
import { createCheckoutSession, savePendingSlideshow } from "@/lib/checkout-client";

import { StepShell } from "./step-shell";
import type { GeneratedSlideshow } from "./types";

// Auth-conscious unlock CTA: signed-in users go straight to a Dodo checkout
// session, signed-out users are handed off to /generate/checkout (the
// "sign in and pay" screen) with this slideshow stashed for pickup once
// they've signed in — see apps/web/src/lib/checkout-client.ts.
export function UnlockStep({ data }: { data: GeneratedSlideshow }) {
  const router = useRouter();
  const { user, isPending } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock() {
    setError("");

    if (!user) {
      savePendingSlideshow(data);
      router.push("/generate/checkout");
      return;
    }

    setIsRedirecting(true);
    try {
      const { checkoutUrl } = await createCheckoutSession(data);
      window.location.href = checkoutUrl;
    } catch (err) {
      setIsRedirecting(false);
      setError(err instanceof Error ? err.message : "Could not start checkout. Try again.");
    }
  }

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
          disabled={isPending || isRedirecting}
          onClick={handleUnlock}
        >
          {isRedirecting ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Redirecting to checkout
            </>
          ) : (
            <>
              Unlock for $2
              <ArrowRight className="size-4" data-icon="inline-end" />
            </>
          )}
        </Button>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <p className="mt-4 text-xs text-muted-foreground">
          {user
            ? "You'll be redirected to a secure DodoPayments checkout."
            : "Sign in on the next screen to unlock — it only takes a few seconds."}
        </p>
      </div>
    </StepShell>
  );
}
