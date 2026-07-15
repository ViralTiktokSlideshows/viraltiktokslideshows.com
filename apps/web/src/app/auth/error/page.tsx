"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { BrandMark } from "@/components/brand-mark";

// Destination for every failure redirect out of apps/server's auth routes:
// `${CORS_ORIGIN}/auth/error?reason=...` — see google/callback (invalid_state,
// google_failed) and magic-link/callback (missing_token, invalid_link) in
// apps/server/src/index.ts.
const REASON_COPY: Record<string, string> = {
  invalid_state: "Your sign-in session expired before Google could confirm it. Give it another try.",
  google_failed: "We couldn't complete sign-in with Google. Give it another try.",
  missing_token: "That sign-in link is missing its token.",
  invalid_link: "That sign-in link is invalid or has already been used. Links expire after 15 minutes.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "";
  const message = REASON_COPY[reason] ?? "We couldn't sign you in. Give it another try.";

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
      <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Sign-in didn&apos;t work</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>

      <Button size="lg" className="mt-8" nativeButton={false} render={<Link href="/signup" />}>
        Back to sign in
      </Button>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
