"use client";

import { Check, Clock, Copy, Download, Loader2, Plus, Share, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { env } from "@viraltiktokslideshows/env/web";

import { GenerateShell } from "@/components/dashboard/generate-shell";
import { SlideshowPhonePreview } from "@/components/generate/slideshow-phone-preview";

// Dodo Payments return_url destination (see apps/server/src/index.ts's
// /api/checkout/create, which sets return_url to
// `${CORS_ORIGIN}/generate/success?purchase=<id>`). The webhook that flips a
// Purchase to PAID/FAILED can land slightly after Dodo redirects the
// customer back here, so this page polls /api/checkout/status briefly
// instead of trusting the redirect alone. Once PAID, this *is* the "ready
// to post" screen — the real unlocked slides, not a placeholder.

type Status = "checking" | "paid" | "pending" | "failed" | "not_found";
type Slide = { index: number; text: string };

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "at",
  "why",
  "how",
  "most",
  "people",
  "you",
  "your",
  "is",
  "are",
]);

function buildCaption(idea: string, hook: string) {
  const caption = `${hook}${hook.endsWith(".") || hook.endsWith("!") ? "" : "."} Save this before you scroll.`;
  const words = (idea || hook).toLowerCase().match(/[a-z]+/g) ?? [];
  const keywords = [...new Set(words.filter((w) => w.length > 3 && !STOP_WORDS.has(w)))].slice(0, 3);
  const hashtags = ["#fyp", "#viral", ...keywords.map((k) => `#${k}`)];
  return { caption, hashtags };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchase");
  const [status, setStatus] = useState<Status>("checking");
  const [idea, setIdea] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [copied, setCopied] = useState(false);

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
        setSlides(Array.isArray(data.slides) ? data.slides : []);

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

  if (status === "paid" && slides.length > 0) {
    const { caption, hashtags } = buildCaption(idea, slides[0]?.text ?? "");

    async function handleCopyAll() {
      try {
        await navigator.clipboard.writeText(`${caption}\n\n${hashtags.join(" ")}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // Clipboard access can fail (permissions, insecure context) — not
        // worth surfacing an error for a copy-to-clipboard convenience.
      }
    }

    return (
      <GenerateShell>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <h1 className="font-display text-base font-bold text-foreground sm:text-lg">
            Your slideshow
          </h1>

          <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
            <SlideshowPhonePreview slides={slides} />

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-spark/15 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-foreground uppercase">
                <Check className="size-3" />
                Slideshow unlocked
              </span>

              <h2 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
                Your slideshow is ready to post
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {idea || slides[0]?.text} <span className="text-muted-foreground/60">·</span>{" "}
                {slides.length} slides
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {/* Real image export needs the actual generation pipeline (slides
                    are text-only right now) — nothing to download yet. */}
                <Button
                  size="lg"
                  className="gap-2"
                  disabled
                  title="Coming soon — slides are text-only until real image generation ships"
                >
                  <Download className="size-4" data-icon="inline-start" />
                  Download all {slides.length} slides
                </Button>
                <Button size="lg" variant="outline" className="gap-2" disabled title="Coming soon">
                  <Share className="size-4" data-icon="inline-start" />
                  Save to camera roll
                </Button>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Caption & hashtags
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="flex items-center gap-1 text-xs font-medium text-riot hover:underline"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy all"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-foreground">{caption}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-2xl bg-accent/10 px-2 py-0.5 text-xs text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-2xl bg-void px-3 py-2 text-xs text-bone">
                  <Clock className="size-3.5 text-spark" />
                  Evenings (7–9pm) tend to post best
                </div>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  nativeButton={false}
                  render={<Link href="/generate" />}
                >
                  <Plus className="size-4" data-icon="inline-start" />
                  Generate another
                </Button>
              </div>
            </div>
          </div>
        </div>
      </GenerateShell>
    );
  }

  return (
    <GenerateShell>
      <div className="flex min-h-[70svh] flex-1 flex-col items-center justify-center px-6 text-center">
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

        {status === "pending" ? (
          <>
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Still confirming…
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your payment is being processed. This page updates automatically — you can also
              close it and check back later from your dashboard.
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
    </GenerateShell>
  );
}

export default function GenerateSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
