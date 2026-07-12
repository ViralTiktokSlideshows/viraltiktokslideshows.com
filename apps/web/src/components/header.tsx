import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-2xl bg-void">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-spark" />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
            viraltiktokslideshows
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

        <Button variant="secondary" size="sm" render={<Link href="/generate" />}>
          Generate free
        </Button>
      </div>
    </header>
  );
}
