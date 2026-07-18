"use client";

import {
  Bookmark,
  FlaskConical,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@viraltiktokslideshows/ui/components/dropdown-menu";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import { BrandMark } from "@/components/brand-mark";
import { type PlanUsage, signOut, useSession } from "@/lib/auth-client";

// No "Generate" entry -- the prominent "New slideshow" button above the nav
// already goes to /generate, so a nav link to the same place was a duplicate.
const NAV_ITEMS = [
  { href: "/dashboard", label: "My slideshows", icon: LayoutGrid },
  { href: "/dashboard/saved", label: "Saved", icon: Bookmark },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

// Shown only in the expanded (dashboard) variant — the compact rail used
// during generate keeps the icon set tight since screen space is precious
// there.
const EXPANDED_ONLY_ITEM = { href: "/dashboard/help", label: "Help & support", icon: HelpCircle };

// Admin-only: the TikHub research page. Appended to the nav only for accounts
// whose session comes back with isAdmin (server ADMIN_EMAILS). Everyone else
// never sees the link, and the page itself + its API are gated too.
const ADMIN_ITEM = { href: "/dashboard/research", label: "Research", icon: FlaskConical };

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", compact && "justify-center")}>
      <BrandMark className="size-7" />
      {!compact ? (
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          viraltiktokslideshows
        </span>
      ) : null}
    </Link>
  );
}

function ProfileMenu({
  compact,
  name,
  email,
  image,
}: {
  compact: boolean;
  name: string;
  email: string;
  image?: string | null;
}) {
  const initial = (name || email || "?").charAt(0).toUpperCase();

  // signOut() itself does the hard redirect to "/" once the session is
  // cleared -- see apps/web/src/lib/auth-client.ts for why that's a real
  // page load rather than a client-side router.push from here.
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
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-2xl p-1.5 text-left transition-colors hover:bg-muted",
          compact && "justify-center",
        )}
      >
        {avatar}
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={compact ? "right" : "top"} className="w-48 rounded-2xl p-1">
        <DropdownMenuItem
          className="cursor-pointer rounded-xl"
          render={<Link href="/dashboard" />}
        >
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

function SidebarContent({
  compact,
  usage,
  onNavigate,
  hideLogo,
}: {
  compact: boolean;
  // undefined = session/plan still loading (render nothing, matches the
  // isPending pattern below); null = confirmed no active plan (show the
  // "No plan" upgrade card, per the requirement that this never just be
  // hidden); a real PlanUsage = active subscription progress bar.
  usage?: PlanUsage | null;
  onNavigate?: () => void;
  // The mobile drawer renders its own logo in its header, so the one inside
  // here is suppressed there to avoid showing it twice.
  hideLogo?: boolean;
}) {
  const pathname = usePathname();
  const { user, isPending } = useSession();
  const baseItems = compact ? NAV_ITEMS : [...NAV_ITEMS, EXPANDED_ONLY_ITEM];
  const items = user?.isAdmin ? [...baseItems, ADMIN_ITEM] : baseItems;

  return (
    <div className="flex h-full flex-col gap-6 p-3">
      {!hideLogo ? (
        <div className={cn("px-1 pt-1", compact && "px-0")}>
          <Logo compact={compact} />
        </div>
      ) : null}

      {compact ? (
        <Button
          size="icon"
          className="mx-auto rounded-2xl"
          nativeButton={false}
          render={<Link href="/generate" onClick={onNavigate} />}
          aria-label="New slideshow"
        >
          <Plus className="size-5" />
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full justify-center gap-2"
          nativeButton={false}
          render={<Link href="/generate" onClick={onNavigate} />}
        >
          <Plus className="size-4" data-icon="inline-start" />
          New slideshow
        </Button>
      )}

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={compact ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                compact && "justify-center px-0 py-2.5",
                active
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
              {!compact ? item.label : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {!compact && usage !== undefined ? (
        usage ? (
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              <span>{usage.label}</span>
              <span>
                {usage.used} / {usage.cap}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-2xl bg-border">
              <div
                className="h-full rounded-2xl bg-spark transition-all duration-500 ease-out"
                style={{ width: `${Math.min((usage.used / usage.cap) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Slideshows generated this month.</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full justify-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              nativeButton={false}
              render={<Link href="/generate/upgrade" onClick={onNavigate} />}
            >
              Go unlimited
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              <span>No plan</span>
              <span>0 left</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Subscribe for monthly slideshow generations.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full justify-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              nativeButton={false}
              render={<Link href="/generate/upgrade" onClick={onNavigate} />}
            >
              Choose a plan
            </Button>
          </div>
        )
      ) : null}

      {!isPending && user ? (
        <ProfileMenu compact={compact} name={user.name ?? user.email} email={user.email} image={user.image} />
      ) : null}
    </div>
  );
}

export function Sidebar({
  variant = "expanded",
  usage,
}: {
  variant?: "expanded" | "compact";
  usage?: PlanUsage | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const compact = variant === "compact";

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card p-3 md:hidden">
        <Logo />
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-muted/40 md:block",
          compact ? "w-[76px]" : "w-[248px]",
        )}
      >
        <SidebarContent compact={compact} usage={usage} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="animate-in fade-in-0 absolute inset-0 bg-void/40 duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-in slide-in-from-left-full absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-card shadow-xl duration-300 ease-out">
            <div className="flex items-center justify-between border-b border-border p-3">
              <Logo />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarContent
              compact={false}
              usage={usage}
              onNavigate={() => setMobileOpen(false)}
              hideLogo
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
