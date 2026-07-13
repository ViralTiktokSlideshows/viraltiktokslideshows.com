"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { EmptyIllustration } from "@/components/dashboard/empty-illustration";
import { SlideshowCard } from "@/components/dashboard/slideshow-card";
import { Reveal } from "@/components/reveal";
import { fetchPurchases, type PurchaseSummary } from "@/lib/purchases-client";

export default function DashboardPage() {
  const [purchases, setPurchases] = useState<PurchaseSummary[] | null>(null);

  useEffect(() => {
    fetchPurchases().then(setPurchases);
  }, []);

  // While anything is still confirming payment, poll so it flips to
  // Paid/Failed live instead of requiring a manual refresh.
  useEffect(() => {
    if (!purchases || !purchases.some((p) => p.status === "PENDING")) return;
    const interval = setInterval(() => {
      fetchPurchases().then(setPurchases);
    }, 3000);
    return () => clearInterval(interval);
  }, [purchases]);

  if (purchases === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Your slideshows
        </h1>
        <Button
          className="gap-1.5 bg-void text-bone hover:bg-void/90"
          nativeButton={false}
          render={<Link href="/generate" />}
        >
          <Plus className="size-4" data-icon="inline-start" />
          New slideshow
        </Button>
      </div>

      {purchases.length === 0 ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 mt-16 flex flex-col items-center text-center duration-500 ease-out sm:mt-24">
          <EmptyIllustration />
          <h2 className="mt-6 font-display text-xl font-bold text-foreground">No slideshows yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Generate your first one — it&apos;s free to try, $2 to unlock the full deck.
          </p>
          <Button size="lg" className="mt-6 gap-2" nativeButton={false} render={<Link href="/generate" />}>
            <Plus className="size-4" data-icon="inline-start" />
            Generate my first slideshow
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {purchases.map((purchase, index) => (
            <Reveal key={purchase.id} delay={Math.min(index, 5) * 60}>
              <SlideshowCard purchase={purchase} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
