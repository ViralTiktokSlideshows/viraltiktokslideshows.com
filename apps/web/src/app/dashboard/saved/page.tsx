"use client";

import { Download, Loader2, RotateCw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { EmptyIllustration } from "@/components/dashboard/empty-illustration";
import { Reveal } from "@/components/reveal";
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

// Split out for its own downloadState -- each card in the grid below needs
// to track its own in-flight download independently of its siblings.
function SavedCard({
  purchase,
  delay,
  onUnsave,
}: {
  purchase: PurchaseSummary;
  delay: number;
  onUnsave: (id: string) => void;
}) {
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "error">("idle");
  const title = purchase.slides[0]?.text || purchase.idea || "Untitled slideshow";
  const thumbnailUrl = purchase.slides[0]?.imageUrl;
  const relative = purchase.createdAt ? formatRelativeTime(purchase.createdAt) : "";
  const hasAnyImage = purchase.slides.some((slide) => slide.imageUrl);

  async function handleDownload() {
    if (downloadState === "downloading") return;
    setDownloadState("downloading");
    try {
      await saveSlidesToDevice(purchase.id, purchase.slides);
      setDownloadState("idle");
    } catch (error) {
      console.error(error);
      setDownloadState("error");
    }
  }

  return (
    <Reveal delay={delay}>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 hover:shadow-md">
        <div className={cn("relative aspect-4/3 w-full", !thumbnailUrl && STRIPES)}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}

          {purchase.format ? (
            <span className="absolute top-2.5 left-2.5 rounded-2xl bg-background/90 px-2 py-1 text-[10px] font-semibold tracking-widest text-foreground uppercase backdrop-blur">
              {FORMAT_LABELS[purchase.format]}
            </span>
          ) : null}

          <button
            type="button"
            aria-label="Unsave this slideshow"
            onClick={() => onUnsave(purchase.id)}
            className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-2xl bg-spark text-primary-foreground shadow-sm transition-transform hover:scale-105"
          >
            <Star className="size-3.5 fill-current" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <p className="line-clamp-2 font-display text-sm leading-snug font-bold text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {relative ? `Saved ${relative}` : "Saved"}
          </p>

          {purchase.status === "PAID" ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-auto w-full justify-center gap-1.5"
              onClick={handleDownload}
              disabled={!hasAnyImage || downloadState === "downloading"}
              title={
                !hasAnyImage
                  ? "No images available for this slideshow"
                  : downloadState === "error"
                    ? "Couldn't download — try again"
                    : undefined
              }
            >
              {downloadState === "downloading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download slides
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="mt-auto w-full justify-center gap-1.5"
              nativeButton={false}
              render={<Link href={`/generate?idea=${encodeURIComponent(purchase.idea)}`} />}
            >
              <RotateCw className="size-3.5" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    </Reveal>
  );
}

export default function SavedPage() {
  const [purchases, setPurchases] = useState<PurchaseSummary[] | null>(null);

  useEffect(() => {
    fetchPurchases().then((all) => setPurchases(all.filter((p) => p.saved)));
  }, []);

  // Optimistic — the card disappears immediately on unsave. If the request
  // somehow fails, it just reappears next time this page loads; not worth
  // a rollback/toast for a low-stakes bookmark toggle.
  async function handleUnsave(id: string) {
    setPurchases((prev) => prev?.filter((p) => p.id !== id) ?? prev);
    try {
      await toggleSaved(id, false);
    } catch {
      // Best-effort, see comment above.
    }
  }

  if (purchases === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Saved</h1>
      <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
        Slideshows you starred to come back to — download the ones that are ready, or regenerate the
        idea for a fresh take.
      </p>

      {purchases.length === 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 mt-16 flex flex-col items-center text-center duration-500 ease-out sm:mt-24">
          <EmptyIllustration />
          <h2 className="mt-6 font-display text-xl font-bold text-foreground">Nothing saved yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Star a slideshow from My slideshows to keep it here as a starting point.
          </p>
          <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/dashboard" />}>
            Go to my slideshows
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {purchases.map((purchase, index) => (
            <SavedCard
              key={purchase.id}
              purchase={purchase}
              delay={Math.min(index, 5) * 60}
              onUnsave={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
