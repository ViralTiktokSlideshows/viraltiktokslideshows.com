"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { BrandMark } from "@/components/brand-mark";

const REASON_COPY: Record<string, string> = {
  checkout_failed: "We couldn't start your checkout session. No charge was made.",
  payment_failed: "Your payment didn't go through. Your card wasn't charged.",
  expired: "That checkout link has expired.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "";
  const message = REASON_COPY[reason] ?? "Something went wrong on our end. Nothing was charged.";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <BrandMark className="size-7" />
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          viraltiktokslideshows
        </span>
      </Link>

      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <XCircle className="size-7 text-destructive" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
        We hit a snag
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>

      <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/generate" />}>
        Try again
      </Button>
    </div>
  );
}

export default function GenerateErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
