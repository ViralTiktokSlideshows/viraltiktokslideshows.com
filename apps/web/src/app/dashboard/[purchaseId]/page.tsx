"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  LayoutGrid,
  Loader2,
  RotateCw,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { SlideshowPhonePreview } from "@/components/generate/slideshow-phone-preview";
import {
  fetchPurchases,
  formatRelativeTime,
  saveSlidesToDevice,
  toggleSaved,
  type PurchaseSummary,
} from "@/lib/purchases-client";
import { FORMAT_LABELS } from "@/lib/settings-client";

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "at", "why",
  "how", "most", "people", "you", "your", "is", "are",
]);

function buildCaption(idea: string, hook: string) {
  const caption = `${hook}${hook.endsWith(".") || hook.endsWith("!") || hook.endsWith("?") ? "" : "."} Save this before you scroll.`;
  const words = (idea || hook).toLowerCase().match(/[a-z]+/g) ?? [];
  const keywords = [...new Set(words.filter((w) => w.length > 3 && !STOP_WORDS.has(w)))].slice(0, 3);
  const hashtags = ["#fyp", "#viral", ...keywords.map((k) => `#${k}`)];
  return { caption, hashtags };
}

export default function SlideshowDetailPage() {
  const params = useParams<{ purchaseId: string }>();
  const [purchase, setPurchase] = useState<PurchaseSummary | null | "not_found">(null);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "error">("idle");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPurchases().then((all) => {
      const found = all.find((p) => p.id === params.purchaseId);
      setPurchase(found ?? "not_found");
      if (found) setSaved(Boolean(found.saved));
    });
  }, [params.purchaseId]);

  if (purchase === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (purchase === "not_found" || purchase.status !== "PAID") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Slideshow not found</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          This slideshow doesn&apos;t exist, isn&apos;t unlocked yet, or belongs to another account.
        </p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const paid = purchase;
  const title = paid.slides[0]?.text || paid.idea || "Your slideshow";
  const hasAnyImage = paid.slides.some((slide) => slide.imageUrl);
  const relative = paid.createdAt ? formatRelativeTime(paid.createdAt) : "";
  const { caption, hashtags } = buildCaption(paid.idea, paid.slides[0]?.text ?? "");
  const chips = [
    ...(paid.format ? [FORMAT_LABELS[paid.format]] : []),
    ...(paid.vibes ?? []).map((v) => v.charAt(0).toUpperCase() + v.slice(1)),
    "1080×1920",
  ];

  async function handleDownload() {
    setDownloadState("downloading");
    try {
      await saveSlidesToDevice(paid.id, paid.slides);
      setDownloadState("idle");
    } catch (error) {
      console.error(error);
      setDownloadState("error");
    }
  }

  async function handleToggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      await toggleSaved(paid.id, next);
    } catch {
      setSaved(!next);
    }
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(`${caption}\n\n${hashtags.join(" ")}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can fail on insecure contexts -- not worth surfacing.
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Back to my slideshows"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
          My slideshows
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
        <span className="max-w-[40ch] truncate font-medium text-foreground">{title}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <div>
          <SlideshowPhonePreview slides={paid.slides} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {paid.slides.map((slide, i) => (
              <div
                key={slide.index}
                className={cn(
                  "relative aspect-9/16 w-9 overflow-hidden rounded-md border",
                  i === 0 ? "border-spark ring-2 ring-spark/40" : "border-border",
                  !slide.imageUrl && STRIPES,
                )}
              >
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.imageUrl} alt="" className="size-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            <span>{paid.slides.length} slides</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="rounded-2xl bg-spark px-2 py-0.5 text-primary-foreground">Paid</span>
            {relative ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal">created {relative}</span>
              </>
            ) : null}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold text-balance text-foreground sm:text-3xl">
            {title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-2xl bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button
              size="lg"
              className="gap-2"
              onClick={handleDownload}
              disabled={!hasAnyImage || downloadState === "downloading"}
              title={hasAnyImage ? undefined : "No images available for this slideshow"}
            >
              {downloadState === "downloading" ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Download className="size-4" data-icon="inline-start" />
              )}
              Download all {paid.slides.length} slides
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Back to all slideshows"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={saved ? "Unsave" : "Save"}
              aria-pressed={saved}
              onClick={handleToggleSave}
              className={saved ? "border-spark text-spark" : undefined}
            >
              <Star className={cn("size-4", saved && "fill-current")} />
            </Button>
            <Button size="icon" variant="outline" aria-label="Copy caption" onClick={handleCopyCaption}>
              {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
            </Button>
          </div>
          {downloadState === "error" ? (
            <p className="mt-2 text-xs text-destructive">
              Couldn&apos;t save your slides just now — please try again in a moment.
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Caption & hashtags
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="flex items-center gap-1 text-xs font-medium text-riot hover:underline"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            <p className="mt-2 text-sm text-foreground">{caption}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span key={tag} className="rounded-2xl bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-void px-3 py-2 text-xs text-bone">
              <Clock className="size-3.5 text-spark" />
              <span className="tracking-widest uppercase text-bone/50">Best posting window</span>
              <span className="font-semibold">Today, 7–9pm</span>
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={`/generate?idea=${encodeURIComponent(paid.idea)}` as Route} />}
            >
              <RotateCw className="size-4" data-icon="inline-start" />
              Regenerate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
