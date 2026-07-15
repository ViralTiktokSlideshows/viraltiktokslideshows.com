import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { BrandMark } from "@/components/brand-mark";
import { Reveal } from "@/components/reveal";

// Every link below points at a real destination — no "#" placeholders.
// Affiliates was dropped entirely rather than stubbed since there's no
// affiliate program to point it at.
const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Generate", href: "/generate" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Formats & vibes", href: "/generate" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "The viral playbook", href: "/#playbook" },
      { label: "Blog", href: "/blog" },
      { label: "Support", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
] as const;

export function FinalCta() {
  return (
    <>
      <section className="px-4 pb-2 sm:px-6">
        <Reveal className="mx-auto max-w-5xl rounded-2xl bg-void px-6 py-14 text-center sm:py-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-[1.1] font-bold text-balance text-bone sm:text-4xl md:text-5xl">
            Your next viral post is one sentence away
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-bone/60 sm:text-base">
            Type an idea, see your hook slide free, and unlock the full deck for $2.
          </p>
          <Button
            size="lg"
            className="mt-8"
            nativeButton={false}
            render={<Link href="/generate" />}
          >
            Generate my slideshow &mdash; free
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <p className="mt-4 text-xs text-bone/40">
            No signup &middot; No credit card &middot; See your first slide instantly
          </p>
        </Reveal>
      </section>

      <footer className="overflow-hidden rounded-t-2xl bg-card px-4 pt-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal className="grid gap-10 border-b border-border pb-10 sm:grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <BrandMark className="size-7" />
                <span className="font-display text-sm font-semibold text-foreground">
                  viraltiktokslideshows
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Turn a single idea into a post-ready, viral slideshow &mdash; hook, slides, and
                images in about 30 seconds.
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href="#"
                  aria-label="TikTok"
                  className="flex size-8 items-center justify-center rounded-2xl border border-border transition-colors hover:border-brand-muted"
                >
                  <Image src="/icons8-tiktok-48.png" alt="" width={16} height={16} />
                </a>
                <a
                  href="#"
                  aria-label="X"
                  className="flex size-8 items-center justify-center rounded-2xl border border-border transition-colors hover:border-brand-muted"
                >
                  <Image src="/icons8-x-50.png" alt="" width={16} height={16} />
                </a>
              </div>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="text-sm font-semibold text-foreground">{column.title}</h4>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>

          <div className="flex flex-col-reverse items-center justify-between gap-4 py-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © 2026 viraltiktokslideshows. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <a href="#" className="hover:text-foreground">
                Cookies Settings
              </a>
            </div>
          </div>

          <p
            aria-hidden
            className="-mb-6 translate-y-[0.12em] text-center font-display text-[22vw] leading-none font-bold text-border/60 select-none sm:text-[14vw]"
          >
            slideshows
          </p>
        </div>
      </footer>
    </>
  );
}
