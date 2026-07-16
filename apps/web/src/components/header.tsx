"use client";

import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@viraltiktokslideshows/ui/components/dropdown-menu";

import { BrandMark } from "@/components/brand-mark";
import { signOut, useSession } from "@/lib/auth-client";

// Anchors are prefixed with "/" (not bare "#...") since this Header also
// renders on /terms and /privacy, which don't have these sections on the
// page -- "/#pricing" navigates home and scrolls; a bare "#pricing" on those
// pages would just silently do nothing.
const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

// Avatar + name dropdown for a signed-in visitor -- mirrors the pattern
// already established in the dashboard sidebar's ProfileMenu, just without
// the "compact" rail variant this header doesn't need.
function ProfileMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const initial = (name || email || "?").charAt(0).toUpperCase();

  // signOut() itself does the hard redirect to "/" once the session is
  // cleared -- see apps/web/src/lib/auth-client.ts.
  async function handleSignOut() {
    await signOut();
  }

  const avatar = image ? (
    <Image src={image} alt="" width={32} height={32} className="size-8 rounded-2xl object-cover" />
  ) : (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-void text-xs font-semibold text-spark">
      {initial}
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-2xl p-1 pr-2.5 transition-colors hover:bg-muted">
        {avatar}
        <span className="max-w-28 truncate text-sm font-medium text-foreground">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-48 rounded-2xl p-1">
        <DropdownMenuItem className="cursor-pointer rounded-xl" render={<Link href="/dashboard" />}>
          <LayoutGrid className="size-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" className="cursor-pointer rounded-xl" onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isPending } = useSession();

  // Close the mobile menu on route change / escape, and stop background
  // scroll while it's open -- small details, but a menu that traps scroll
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

  async function handleMobileSignOut() {
    await signOut();
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <BrandMark className="size-7" />
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
          {isPending ? null : user ? (
            <>
              <ProfileMenu name={user.name ?? user.email} email={user.email} image={user.image} />
              <Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/generate" />}>
                Generate
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/signup" />}>
                Sign in
              </Button>
              <Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/generate" />}>
                Generate
              </Button>
            </>
          )}
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
              {isPending ? null : user ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    nativeButton={false}
                    render={<Link href="/dashboard" onClick={() => setMobileOpen(false)} />}
                  >
                    <LayoutGrid className="size-4" data-icon="inline-start" />
                    Dashboard
                  </Button>
                  <Button
                    className="w-full justify-center"
                    nativeButton={false}
                    render={<Link href="/generate" onClick={() => setMobileOpen(false)} />}
                  >
                    Generate free
                  </Button>
                  <Button variant="ghost" className="w-full justify-center" onClick={handleMobileSignOut}>
                    <LogOut className="size-4" data-icon="inline-start" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
