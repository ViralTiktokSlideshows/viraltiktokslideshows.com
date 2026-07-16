"use client";

import { Download, Loader2, RotateCw, Star } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { downloadPurchaseZip, formatRelativeTime, type PurchaseSummary } from "@/lib/purchases-client";

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]";

const STATUS_CONFIG = {
  PENDING: { badge: "Processing", badgeClass: "bg-spark/25 text-foreground" },
  PAID: { badge: "Paid", badgeClass: "bg-spark text-primary-foreground" },
  FAILED: { badge: "Failed", badgeClass: "bg-destructive/10 text-destructive" },
  CANCELED: { badge: "Canceled", badgeClass: "bg-destructive/10 text-destructive" },
} as const;

export function SlideshowCard({
  purchase,
  onToggleSaved,
}: {
  purchase: PurchaseSummary;
  onToggleSaved?: (id: string, saved: boolean) => void;
}) {
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "error">("idle");
  const title = purchase.slides[0]?.text || purchase.idea || "Untitled slideshow";
  const config = STATUS_CONFIG[purchase.status];
  const relative = purchase.createdAt ? formatRelativeTime(purchase.createdAt) : "";
  const thumbnailUrl = purchase.slides[0]?.imageUrl;
  const hasAnyImage = purchase.slides.some((slide) => slide.imageUrl);

  // Stops the click from bubbling into the "View slideshow" link the button
  // sits next to and grabs the zip right from the card -- same download
  // used on the detail page and /generate/success, just without leaving
  // /dashboard for it.
  async function handleDownload(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (downloadState === "downloading") return;
    setDownloadState("downloading");
    try {
      await downloadPurchaseZip(purchase.id);
      setDownloadState("idle");
    } catch (error) {
      console.error(error);
      setDownloadState("error");
    }
  }

  const subtext =
    purchase.status === "PENDING"
      ? "Confirming payment"
      : purchase.status === "FAILED" || purchase.status === "CANCELED"
        ? "Payment didn't go through"
        : `${purchase.slides.length} slide${purchase.slides.length === 1 ? "" : "s"}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 hover:shadow-md">
      <div className={cn("relative aspect-4/3 w-full", !thumbnailUrl && STRIPES)}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}
        <span
          className={cn(
            "absolute top-2.5 right-2.5 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-widest uppercase",
            config.badgeClass,
          )}
        >
          {config.badge}
        </span>
        {onToggleSaved ? (
          <button
            type="button"
            aria-label={purchase.saved ? "Unsave this slideshow" : "Save this slideshow"}
            aria-pressed={purchase.saved}
            onClick={() => onToggleSaved(purchase.id, !purchase.saved)}
            className={cn(
              "absolute top-2.5 left-2.5 flex size-7 items-center justify-center rounded-2xl shadow-sm transition-transform hover:scale-105",
              purchase.saved
                ? "bg-spark text-primary-foreground"
                : "bg-background/90 text-muted-foreground backdrop-blur hover:text-foreground",
            )}
          >
            <Star className={cn("size-3.5", purchase.saved && "fill-current")} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-2 font-display text-sm leading-snug font-bold text-foreground">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {subtext}
          {relative ? ` · ${relative}` : ""}
        </p>

        {purchase.status === "PAID" ? (
          <div className="mt-auto flex gap-2">
            <Button
              size="sm"
              className="flex-1 justify-center bg-void text-bone hover:bg-void/90"
              nativeButton={false}
              render={<Link href={`/dashboard/${purchase.id}`} />}
            >
              View slideshow
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Download slides"
              title={
                !hasAnyImage
                  ? "No images available for this slideshow"
                  : downloadState === "error"
                    ? "Couldn't download — try again"
                    : "Download slides"
              }
              onClick={handleDownload}
              disabled={!hasAnyImage || downloadState === "downloading"}
            >
              {downloadState === "downloading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </Button>
          </div>
        ) : purchase.status === "PENDING" ? (
          <Button size="sm" disabled className="mt-auto w-full justify-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" />
            Processing…
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-auto w-full justify-center gap-1.5"
            nativeButton={false}
            render={<Link href="/generate" />}
          >
            <RotateCw className="size-3.5" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
