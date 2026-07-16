"use client";

import { Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { GenerateShell } from "@/components/dashboard/generate-shell";
import { type PlanTier, useSession } from "@/lib/auth-client";
import { subscribeToPlan } from "@/lib/settings-client";

// Real subscription checkout now that Dodo's subscription products exist
// (see /api/billing/subscribe) — signed-in users go straight to a Dodo
// checkout session; signed-out visitors are sent to sign in first with the
// chosen tier carried in the callback URL's ?tier= param, then this page
// auto-resumes the same checkout the moment it re-mounts signed in. Mirrors
// the pattern reveal-step.tsx uses for the $2 unlock, just without needing
// to stash any slideshow data — there's nothing to remember but the tier.
//
// useSearchParams() requires a Suspense boundary during static generation
// (Next.js build error otherwise, see generate/checkout/page.tsx for the
// same pattern) -- UpgradeContent holds all the actual logic/markup,
// UpgradePage below just wraps it.
function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isPending } = useSession();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState("");
  const resumedRef = useRef(false);

  async function handleUpgrade(tier: PlanTier) {
    // Same belt-and-suspenders guard as reveal-step.tsx's "Try for $2" --
    // the disabled prop on the buttons below is a paint behind this click,
    // so a fast double-click/tap can still fire a second subscribeToPlan()
    // call (a second, unused Dodo checkout session) before it's committed.
    if (loadingTier) return;

    setError("");

    if (!user) {
      const callbackURL = `/generate/upgrade?tier=${tier}`;
      router.push(`/signup?callbackURL=${encodeURIComponent(callbackURL)}`);
      return;
    }

    setLoadingTier(tier);
    try {
      await subscribeToPlan(tier);
    } catch (err) {
      setLoadingTier(null);
      setError(err instanceof Error ? err.message : "Could not start checkout. Try again.");
    }
  }

  // Resume: if we landed here with ?tier= (bounced back from sign-in) and
  // we're now signed in, finish the checkout automatically instead of
  // making them click the button again.
  useEffect(() => {
    if (resumedRef.current || isPending || !user) return;
    const tier = searchParams.get("tier");
    if (tier === "CREATOR" || tier === "PRO" || tier === "AGENCY") {
      resumedRef.current = true;
      handleUpgrade(tier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, user, searchParams]);

  return (
    <GenerateShell>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/10">
          <Zap className="size-5 text-accent" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-balance text-foreground sm:text-3xl">
          Get more slideshows every month
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Subscribe for a monthly batch of unlocked slideshows instead of paying $2 each time.
        </p>

        <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 text-left">
            <p className="text-sm font-semibold text-foreground">Creator</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              $19.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">20 slideshows / month</p>
            <Button
              variant="outline"
              className="mt-4 w-full justify-center"
              disabled={loadingTier !== null}
              onClick={() => handleUpgrade("CREATOR")}
            >
              {loadingTier === "CREATOR" ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : null}
              Upgrade to Creator
            </Button>
          </div>

          <div className="relative rounded-2xl border-2 border-void bg-void p-5 text-left text-bone">
            <span className="absolute -top-2.5 right-5 rounded-2xl bg-spark px-2 py-0.5 text-[10px] font-semibold tracking-widest text-void uppercase">
              Recommended
            </span>
            <p className="text-sm font-semibold">Pro</p>
            <p className="mt-2 font-display text-2xl font-bold">
              $59.99<span className="text-sm font-normal text-bone/60">/mo</span>
            </p>
            <p className="mt-1 text-xs text-bone/60">60 slideshows / month</p>
            <Button
              className="mt-4 w-full justify-center"
              disabled={loadingTier !== null}
              onClick={() => handleUpgrade("PRO")}
            >
              {loadingTier === "PRO" ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : null}
              Upgrade to Pro
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-left">
            <p className="text-sm font-semibold text-foreground">Agency</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">
              $199.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">200 slideshows / month</p>
            <Button
              variant="outline"
              className="mt-4 w-full justify-center"
              disabled={loadingTier !== null}
              onClick={() => handleUpgrade("AGENCY")}
            >
              {loadingTier === "AGENCY" ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : null}
              Upgrade to Agency
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

        <p className="mt-6 text-xs text-muted-foreground">
          Just need this one?{" "}
          <Link href="/generate" className="text-riot hover:underline">
            Generate a slideshow — $2 to unlock
          </Link>
        </p>
      </div>
    </GenerateShell>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <UpgradeContent />
    </Suspense>
  );
}
