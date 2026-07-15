import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why viraltiktokslideshows exists, how it actually works, and how we price it — no subscription, no fine print.",
  alternates: { canonical: "/about" },
};

const SECTIONS = [
  {
    title: "Why this exists",
    body: `A TikTok slideshow that actually performs needs more than text dropped onto photos — it needs a hook that stops the scroll, a structure that pays off, and enough slides to keep someone swiping. Doing that well, by hand, slideshow after slideshow, is slow. We built this to remove the slow part: you bring the idea, it writes and designs the rest in about 30 seconds.`,
  },
  {
    title: "What it actually does",
    body: `Type one sentence. AI trained on what performs writes your hook slide and every slide after it, then generates a real background image for each one. You see the hook slide for free, before paying anything — if it doesn't stop you mid-scroll, you never have to pay for the rest.`,
  },
  {
    title: "The playbook behind it",
    body: `We analyzed 100+ viral TikTok slideshows to find what they consistently got right — hook structure, slide count, text placement, payoff timing. Every slideshow generated here follows that playbook automatically, instead of starting from a blank page.`,
  },
  {
    title: "How we price it",
    body: `No subscription, no credits that expire, no free trial that quietly starts charging you later. Unlocking a slideshow — every slide, full quality, downloadable, yours forever — is a one-time $2 payment. That's the whole model.`,
  },
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        About viraltiktokslideshows
      </h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Turn a single idea into a post-ready, viral TikTok slideshow — no design skills, no
        subscription.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}

        <section>
          <h2 className="font-display text-lg font-bold text-foreground">Get in touch</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Questions, feedback, or something broken? Reach us anytime at{" "}
            <a
              href="mailto:support@viraltiktokslideshows.com"
              className="text-foreground hover:underline"
            >
              support@viraltiktokslideshows.com
            </a>
            , or visit the{" "}
            <Link href="/contact" className="text-foreground hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
