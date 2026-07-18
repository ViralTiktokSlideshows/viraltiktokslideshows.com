"use client";

import { ArrowRight, Loader2, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@viraltiktokslideshows/ui/components/alert-dialog";
import { Button } from "@viraltiktokslideshows/ui/components/button";

import { trackEvent } from "@/lib/analytics";
import { getFreshUser, useSession, type PlanUsage } from "@/lib/auth-client";
import { createCheckoutSession, savePendingSlideshow } from "@/lib/checkout-client";

import { StepShell } from "./step-shell";
import type { GeneratedSlideshow } from "./types";

// Reveal + unlock collapsed into a single step. Behaviour depends on the
// viewer's plan (checked fresh on mount, since they may have just
// subscribed):
//   - Plan with credits left -> skip the "Try for $2" step entirely: build
//     the full slideshow on their plan quota and go straight to the success
//     page. They never see the intermediate unlock screen.
//   - Plan but OUT of credits -> show an "out of credits" popup (buy more,
//     or continue for $2 this once).
//   - No plan -> the normal hook preview + "Try for $2".
//
// The server decides plan-covered vs $2 at checkout time (see
// /api/checkout/create), so proceed() just creates the checkout and follows
// wherever it points -- the success page for a plan-covered generation, or a
// Dodo $2 checkout otherwise.
type Gate = "checking" | "auto" | "out-of-credits" | "none";

export function RevealStep({ data }: { data: GeneratedSlideshow }) {
  const router = useRouter();
  const { user } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [gate, setGate] = useState<Gate>("checking");
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const startedRef = useRef(false);

  const remaining = Math.max(data.slideCount - 1, 0);
  const hookImageUrl = data.slides[0]?.imageUrl;

  // Creates the checkout and follows it -- to the success page if the server
  // covered it with the plan, or to a Dodo $2 checkout otherwise. Handles a
  // signed-out viewer by stashing the slideshow and sending them to sign in.
  async function proceed() {
    if (isRedirecting) return;
    setError("");
    setIsRedirecting(true);

    trackEvent("unlock_click", { gate });

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

  // Decide the flow once, from a FRESH session (a stale useSession() might
  // not yet reflect a subscription the user just bought).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    getFreshUser().then((fresh) => {
      if (cancelled) return;
      const freshPlan = fresh?.plan ?? null;
      setPlan(freshPlan);

      if (freshPlan && freshPlan.used < freshPlan.cap) {
        // Plan with credits: build it now, no unlock step.
        setGate("auto");
        proceed();
      } else if (freshPlan) {
        setGate("out-of-credits");
        setShowOutOfCredits(true);
      } else {
        setGate("none");
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plan-covered generation (or the initial fresh-session check): no unlock
  // screen, just a build-in-progress state until the redirect lands. Mirrors
  // GeneratingStep's animated-card treatment so the whole generate flow feels
  // like one continuous experience.
  if (gate === "checking" || gate === "auto") {
    return (
      <StepShell>
        <div className="animate-in fade-in-0 flex flex-col items-center py-16 text-center duration-500 ease-out">
          <div className="relative h-40 w-32">
            <div className="absolute inset-2 rounded-2xl bg-border" />
            <div className="absolute inset-0 animate-pulse rounded-2xl border border-border bg-gradient-to-br from-spark/40 via-spark/15 to-transparent shadow-lg" />
            <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5">
              <div className="h-2 w-3/4 rounded-2xl bg-spark/50" />
              <div className="h-2 w-1/2 rounded-2xl bg-spark/35" />
            </div>
          </div>

          <h2 className="mt-8 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {gate === "auto" ? "Building your full slideshow…" : "Getting things ready…"}
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {gate === "auto"
              ? "Using your plan — all your slides, full quality. This only takes a few seconds."
              : "One moment while we set things up."}
          </p>

          <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-2xl bg-border">
            <div className="h-full w-1/2 animate-pulse rounded-2xl bg-spark" />
          </div>
        </div>
      </StepShell>
    );
  }

  const outOfCredits = gate === "out-of-credits";

  return (
    <>
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
            disabled={isRedirecting}
            onClick={outOfCredits ? () => setShowOutOfCredits(true) : proceed}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Redirecting to checkout
              </>
            ) : (
              <>
                {outOfCredits ? "Unlock this slideshow" : "Try for $2"}
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

      <AlertDialog open={showOutOfCredits} onOpenChange={setShowOutOfCredits}>
        <AlertDialogPopup className="w-[26rem] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border-0 bg-void p-0 text-bone">
          <div className="relative p-6">
            <AlertDialogClose
              aria-label="Close"
              className="absolute top-4 right-4 rounded-full p-1 text-bone/50 transition-colors hover:bg-bone/10 hover:text-bone"
            >
              <X className="size-4" />
            </AlertDialogClose>

            <span className="flex size-11 items-center justify-center rounded-2xl bg-spark/15">
              <Zap className="size-5 text-spark" />
            </span>

            <AlertDialogTitle className="mt-4 text-bone">You&apos;re out of credits</AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5 text-bone/70">
              You&apos;ve used all {plan?.cap ?? "your"} slideshows in your {plan?.label ?? "current"}{" "}
              plan this month. Upgrade for more, or unlock just this one for $2.
            </AlertDialogDescription>

            <Button
              size="lg"
              className="mt-5 w-full justify-center gap-1.5 bg-spark text-void hover:bg-spark/90"
              nativeButton={false}
              render={<Link href="/generate/upgrade" />}
            >
              <Zap className="size-4" data-icon="inline-start" />
              Buy more
            </Button>

            <button
              type="button"
              className="mt-3 w-full text-center text-xs font-medium text-bone/50 transition-colors hover:text-bone/80"
              onClick={() => {
                setShowOutOfCredits(false);
                proceed();
              }}
            >
              Continue for $2
            </button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
