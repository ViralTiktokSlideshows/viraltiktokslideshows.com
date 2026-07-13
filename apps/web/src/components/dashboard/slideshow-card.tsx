"use client";

import { Loader2, RotateCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { formatRelativeTime, type PurchaseSummary } from "@/lib/purchases-client";

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0px,var(--color-muted)_10px,transparent_10px,transparent_20px)]";

const STATUS_CONFIG = {
  PENDING: { badge: "Processing", badgeClass: "bg-spark/25 text-foreground" },
  PAID: { badge: "Paid", badgeClass: "bg-spark text-primary-foreground" },
  FAILED: { badge: "Failed", badgeClass: "bg-destructive/10 text-destructive" },
  CANCELED: { badge: "Canceled", badgeClass: "bg-destructive/10 text-destructive" },
} as const;

export function SlideshowCard({ purchase }: { purchase: PurchaseSummary }) {
  const title = purchase.slides[0]?.text || purchase.idea || "Untitled slideshow";
  const config = STATUS_CONFIG[purchase.status];
  const relative = purchase.createdAt ? formatRelativeTime(purchase.createdAt) : "";

  const subtext =
    purchase.status === "PENDING"
      ? "Confirming payment"
      : purchase.status === "FAILED" || purchase.status === "CANCELED"
        ? "Payment didn't go through"
        : `${purchase.slides.length} slide${purchase.slides.length === 1 ? "" : "s"}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 hover:shadow-md">
      <div className={cn("relative aspect-4/3 w-full", STRIPES)}>
        <span
          className={cn(
            "absolute top-2.5 right-2.5 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-widest uppercase",
            config.badgeClass,
          )}
        >
          {config.badge}
        </span>
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
          <Button
            size="sm"
            className="mt-auto w-full justify-center bg-void text-bone hover:bg-void/90"
            nativeButton={false}
            render={<Link href={`/dashboard/${purchase.id}`} />}
          >
            View slideshow
          </Button>
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
