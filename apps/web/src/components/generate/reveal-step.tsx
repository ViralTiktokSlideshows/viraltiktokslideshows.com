"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { getFreshUser, useSession } from "@/lib/auth-client";
import { createCheckoutSession, savePendingSlideshow } from "@/lib/checkout-client";

import { StepShell } from "./step-shell";
import type { GeneratedSlideshow } from "./types";

// Reveal + unlock collapsed into a single step: the hook slide, straight
// into "Try for $2" with the same auth-conscious checkout logic that used
// to live on a separate UnlockStep screen — signed-in users go straight to
// a Dodo checkout session, signed-out users are handed off to
// /generate/checkout (the "sign in and pay" screen) with this slideshow
// stashed for pickup once they've signed in — see
// apps/web/src/lib/checkout-client.ts.
export function RevealStep({ data }: { data: GeneratedSlideshow }) {
  const router = useRouter();
  const { user, isPending } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  // Stable for the lifetime of this mounted step — repeat clicks (double
  // click, retry after an error) reuse the same key so the server dedupes
  // them into a single Purchase instead of creating duplicates.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const remaining = Math.max(data.slideCount - 1, 0);
  const hookImageUrl = data.slides[0]?.imageUrl;

  async function handleUnlock() {
    setError("");

    if (!user) {
      savePendingSlideshow(data);
      router.push("/generate/checkout");
      return;
    }

    setIsRedirecting(true);

    // The sidebar/header's "signed in" state comes from whatever
    // useSession() last fetched -- which can be stale by the time someone
    // actually clicks Unlock (session expired, signed out in another tab,
    // etc.). Re-checking fresh here means a session that's gone stale gets
    // caught and sent to sign in cleanly, instead of firing off a checkout
    // call that 401s and shows a confusing "Not authenticated" error while
    // the rest of the app still looks signed in.
    const freshUser = await getFreshUser();
    if (!freshUser) {
      setIsRedirecting(false);
      savePendingSlideshow(data);
      router.push("/generate/checkout");
      return;
    }

    try {
      const { checkoutUrl } = await createCheckoutSession({ ...data, idempotencyKey });
      window.location.href = checkoutUrl;
    } catch (err) {
      setIsRedirecting(false);
      setError(err instanceof Error ? err.message : "Could not start checkout. Try again.");
    }
  }

  return (
    <StepShell>
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Here&apos;s your hook slide
        </p>

        <div className="relative mt-8 h-[260px] w-[190px] sm:h-[300px] sm:w-[220px]">
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-2xl border border-border bg-muted/60" />
          <div className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {hookImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hookImageUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
                draggable={false}
              />
            ) : null}
            <div
              className={
                hookImageUrl
                  ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/80 via-void/10 to-transparent p-4 pt-12 text-left"
                  : "flex h-full flex-col justify-between p-4 text-left"
              }
            >
              <span
                className={
                  hookImageUrl
                    ? "hidden"
                    : "font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
                }
              >
                Slide 1 / {data.slideCount}
              </span>
              <p
                className={
                  hookImageUrl
                    ? "font-display text-xl leading-tight font-bold text-white sm:text-2xl"
                    : "font-display text-xl leading-tight font-bold text-foreground sm:text-2xl"
                }
              >
                {data.hook}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {remaining} more slide{remaining === 1 ? "" : "s"} ready behind it
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-8"
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
              Try for $2
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
