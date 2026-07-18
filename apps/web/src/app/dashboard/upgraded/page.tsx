"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { getFreshUser, useSession, type SessionUser } from "@/lib/auth-client";

// Where Dodo returns a customer after a successful subscription checkout
// (see createPlanCheckoutSession's returnUrl in apps/server/src/index.ts).
// The subscription.active webhook flips the User's plan, but it can land a
// beat after the redirect -- so this polls a fresh session briefly until the
// plan shows up, then celebrates it.

// A few scattered confetti dots, positioned + colored to match the design.
const CONFETTI = [
  { top: "8%", left: "20%", color: "bg-spark", delay: "0ms" },
  { top: "16%", left: "58%", color: "bg-riot", delay: "120ms" },
  { top: "22%", left: "82%", color: "bg-accent", delay: "240ms" },
  { top: "38%", left: "10%", color: "bg-riot", delay: "80ms" },
  { top: "60%", left: "86%", color: "bg-spark", delay: "300ms" },
  { top: "72%", left: "16%", color: "bg-accent", delay: "180ms" },
  { top: "78%", left: "70%", color: "bg-spark", delay: "360ms" },
] as const;

function formatRenewal(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default function UpgradedPage() {
  const { user } = useSession();
  const [freshUser, setFreshUser] = useState<SessionUser | null | undefined>(undefined);

  // Refresh the session on mount, retrying a few times if the plan hasn't
  // been applied by the webhook yet.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      const u = await getFreshUser();
      if (cancelled) return;
      setFreshUser(u);
      if (!u?.plan && attempts < 6) {
        setTimeout(poll, 1500);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = freshUser?.plan ?? user?.plan ?? null;
  const email = freshUser?.email ?? user?.email ?? "your email";
  const loading = freshUser === undefined && !user?.plan;

  const planLabel = plan?.label ?? "your new plan";
  const cap = plan?.cap ?? null;
  const renewal = formatRenewal(plan?.periodEnd ?? null);

  const features = [
    cap ? `${cap} / month` : "More slideshows",
    "Full quality",
    "Priority support",
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Confetti */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {CONFETTI.map((dot, i) => (
          <span
            key={i}
            className={`animate-in fade-in-0 zoom-in-50 absolute size-2 rounded-[3px] ${dot.color} duration-700 ease-out`}
            style={{ top: dot.top, left: dot.left, animationDelay: dot.delay }}
          />
        ))}
      </div>

      {/* Card stack + check */}
      <div className="animate-in fade-in-0 zoom-in-95 relative mb-8 duration-500 ease-out">
        <div className="relative h-40 w-44">
          <div className="absolute inset-x-6 top-2 h-36 rotate-[-8deg] rounded-2xl border border-border bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]" />
          <div className="absolute inset-x-6 top-1 h-36 rotate-[6deg] rounded-2xl border border-border bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]" />
          <div className="absolute inset-x-6 top-0 h-36 rounded-2xl border border-border bg-card shadow-lg" />
          <span className="animate-in zoom-in-50 absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-riot text-white shadow-md delay-200 duration-500 ease-out">
            <Check className="size-6" strokeWidth={3} />
          </span>
        </div>
      </div>

      {loading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-col items-center duration-500 ease-out">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Payment confirmed
          </span>
          <h1 className="mt-3 max-w-xl font-display text-3xl font-bold text-balance text-foreground sm:text-4xl md:text-5xl">
            You&apos;re on {planLabel}. Let&apos;s go viral.
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Your account is upgraded
            {cap ? (
              <>
                {" "}
                — <span className="font-semibold text-foreground">{cap} slideshows a month</span>
              </>
            ) : null}
            , full quality, no per-unlock checkout. A receipt is on its way to {email}.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {features.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <Check className="size-3.5 text-riot" />
                {f}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2" nativeButton={false} render={<Link href="/generate" />}>
              Make your next slideshow
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Link
              href="/dashboard/settings"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View receipt
            </Link>
          </div>

          {renewal ? (
            <p className="mt-6 text-xs text-muted-foreground">
              Renews {renewal} · manage anytime in Settings.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
