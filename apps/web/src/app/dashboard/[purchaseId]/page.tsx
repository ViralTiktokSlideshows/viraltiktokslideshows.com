"use client";

import { ChevronLeft, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { SlideshowPhonePreview } from "@/components/generate/slideshow-phone-preview";
import { fetchPurchase, saveSlidesToDevice, type PurchaseSummary } from "@/lib/purchases-client";

export default function SlideshowDetailPage() {
  const params = useParams<{ purchaseId: string }>();
  const [purchase, setPurchase] = useState<PurchaseSummary | null | "not_found">(null);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "error">("idle");

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
  const hasAnyImage = purchase.slides.some((slide) => slide.imageUrl);

  async function handleDownload() {
    if (purchase === null || purchase === "not_found") return;
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

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <SlideshowPhonePreview slides={purchase.slides} />

        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {purchase.slides.length} slides
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>

          <Button
            size="lg"
            className="mt-6 gap-2"
            onClick={handleDownload}
            disabled={!hasAnyImage || downloadState === "downloading"}
            title={hasAnyImage ? undefined : "No images available for this slideshow"}
          >
            {downloadState === "downloading" ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Download className="size-4" data-icon="inline-start" />
            )}
            Download all {purchase.slides.length} slides
          </Button>
          {downloadState === "error" ? (
            <p className="mt-2 text-xs text-destructive">
              Couldn&apos;t download — the images may have expired.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
