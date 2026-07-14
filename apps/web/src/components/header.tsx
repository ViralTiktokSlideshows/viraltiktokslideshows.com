"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

// Anchors are prefixed with "/" (not bare "#...") since this Header also
// renders on /terms and /privacy, which don't have these sections on the
// page — "/#pricing" navigates home and scrolls; a bare "#pricing" on those
// pages would just silently do nothing.
const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu on route change / escape, and stop background
  // scroll while it's open — small details, but a menu that traps scroll
  // or survives a navigation reads as broken.
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-2xl bg-void">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-spark" />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
            Viral Tiktok Slideshows
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Sign in
          </Button>
          <Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/generate" />}>
            Generate free
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-2xl border border-border text-foreground transition-colors hover:bg-muted md:hidden"
        >
          {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="animate-in fade-in-0 slide-in-from-top-2 border-t border-border bg-background duration-200 ease-out md:hidden">
          <nav className="flex flex-col px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-border py-3 text-sm font-medium text-foreground last:border-b-0"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="w-full justify-center"
                nativeButton={false}
                render={<Link href="/signup" onClick={() => setMobileOpen(false)} />}
              >
                Sign in
              </Button>
              <Button
                className="w-full justify-center"
                nativeButton={false}
                render={<Link href="/generate" onClick={() => setMobileOpen(false)} />}
              >
                Generate free
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
