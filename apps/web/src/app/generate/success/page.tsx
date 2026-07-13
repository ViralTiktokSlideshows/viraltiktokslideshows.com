"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { env } from "@viraltiktokslideshows/env/web";

// Dodo Payments return_url destination (see apps/server/src/index.ts's
// /api/checkout/create, which sets return_url to
// `${CORS_ORIGIN}/generate/success?purchase=<id>`). The webhook that flips a
// Purchase to PAID/FAILED can land slightly after Dodo redirects the
// customer back here, so this page polls /api/checkout/status briefly
// instead of trusting the redirect alone.

type Status = "checking" | "paid" | "pending" | "failed" | "not_found";

function SuccessContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchase");
  const [status, setStatus] = useState<Status>("checking");
  const [idea, setIdea] = useState("");

  useEffect(() => {
    if (!purchaseId) {
      setStatus("not_found");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(
          `${env.NEXT_PUBLIC_SERVER_URL}/api/checkout/status?purchase=${purchaseId}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          if (!cancelled) setStatus("not_found");
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setIdea(typeof data.idea === "string" ? data.idea : "");

        if (data.status === "PAID") {
          setStatus("paid");
        } else if (data.status === "FAILED" || data.status === "CANCELED") {
          setStatus("failed");
        } else if (attempts < 10) {
          setTimeout(poll, 1500);
        } else {
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("not_found");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-2xl bg-void">
          <span className="size-2.5 rotate-45 rounded-[2px] bg-spark" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          viraltiktokslideshows
        </span>
      </Link>

      {status === "checking" ? (
        <>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
            Confirming your payment…
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </>
      ) : null}

      {status === "paid" ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-spark/15">
            <CheckCircle2 className="size-7 text-spark" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">You&apos;re unlocked</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {idea ? `Your slideshow for "${idea}" is ready.` : "Your slideshow is ready."} We&apos;re
            putting the finishing touches on the viewer — check back shortly to download it.
          </p>
          <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/generate" />}>
            Create another
          </Button>
        </>
      ) : null}

      {status === "pending" ? (
        <>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Still confirming…</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your payment is being processed. This page updates automatically — you can also close
            it and check back later.
          </p>
        </>
      ) : null}

      {status === "failed" || status === "not_found" ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <XCircle className="size-7 text-destructive" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
            {status === "failed" ? "Payment didn't go through" : "We couldn't find that purchase"}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {status === "failed"
              ? "Your card wasn't charged. You can try again whenever you're ready."
              : "The link you followed may have expired. Head back and start a new slideshow."}
          </p>
          <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/generate" />}>
            Back to generate
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default function GenerateSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
