"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { fetchPurchase, type PurchaseSummary } from "@/lib/purchases-client";

export default function SlideshowDetailPage() {
  const params = useParams<{ purchaseId: string }>();
  const [purchase, setPurchase] = useState<PurchaseSummary | null | "not_found">(null);

  useEffect(() => {
    fetchPurchase(params.purchaseId).then((data) => setPurchase(data ?? "not_found"));
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

  const title = purchase.slides[0]?.text || purchase.idea || "Your slideshow";

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Back"
        className="mb-6"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {purchase.slides.length} slides
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {purchase.slides.map((slide) => (
          <div
            key={slide.index}
            className="animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[180px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm duration-500 ease-out"
            style={{ animationDelay: `${Math.min(slide.index - 1, 6) * 60}ms` }}
          >
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Slide {slide.index} / {purchase.slides.length}
            </span>
            <p className="font-display text-base leading-tight font-bold text-foreground">
              {slide.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
