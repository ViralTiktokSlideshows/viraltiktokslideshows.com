"use client";

import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { useSession } from "@/lib/auth-client";
import { BrandMark } from "@/components/brand-mark";

import { AppFrame } from "./app-frame";
import { Sidebar } from "./sidebar";

// Unlike DashboardShell, this never redirects — generating a free preview
// has never required an account (that's the whole "free to try" pitch on
// the landing page) and shouldn't start requiring one now just because the
// flow moved into the app shell. Signed-in users get the full shell with
// the compact sidebar; signed-out users get a minimal top bar instead.
export function GenerateShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useSession();

  if (!isPending && user) {
    return <AppFrame sidebar={<Sidebar variant="compact" />}>{children}</AppFrame>;
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="font-display text-sm font-semibold tracking-tight text-foreground">
            viraltiktokslideshows
          </span>
        </Link>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/signup" />}>
          Sign in
        </Button>
      </div>
      {children}
    </div>
  );
}
