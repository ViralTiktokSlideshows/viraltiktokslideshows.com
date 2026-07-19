import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { getAllPosts, getPost } from "@/lib/blog";

const BASE_URL = "https://viraltiktokslideshows.com";

// Reusable typographic classes — this repo has no @tailwindcss/typography
// plugin, so headings/paragraphs are styled explicitly to stay on-brand and
// readable. scroll-mt keeps anchored headings clear of any sticky header.
const H2 = "mt-12 font-display text-2xl font-bold text-foreground scroll-mt-24";
const H3 = "mt-8 font-display text-lg font-bold text-foreground";
const P = "mt-4 text-[15px] leading-relaxed text-foreground/80";
const LI = "text-[15px] leading-relaxed text-foreground/80";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `/blog/${post.slug}`;
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

// Each post's FAQ — rendered visibly AND emitted as FAQPage JSON-LD (rich
// results). Keep the two in exact sync; the visible copy is the source.
const FAQS: Record<string, { q: string; a: string }[]> = {
  "how-many-slides-should-a-tiktok-slideshow-have": [
    {
      q: "How many slides should a TikTok slideshow have?",
      a: "The best-performing TikTok slideshows cluster at either 2–3 slides (a quote, claim, or hot take) or 6–8 slides (a list or story). In an analysis of 125 viral slideshows, 35% used 2–3 slides and 34% used 6–8, while only about 12% used 4–5. Pick one of the two sweet spots and avoid the 4–5 dead zone.",
    },
    {
      q: "What is the ideal length for a TikTok slideshow?",
      a: "There isn't a single ideal length — it depends on your format. For a punchy quote or hot take, 2–3 slides is ideal. For a list, tips, or a story, 6–8 slides is ideal. The median across 125 viral slideshows was 6 slides.",
    },
    {
      q: "How many photos can you put in a TikTok slideshow?",
      a: "TikTok lets you add up to 35 photos in a slideshow, but viral posts rarely use that many. Outside of long book-recommendation lists, almost all high-performing slideshows stay at 8 slides or fewer.",
    },
    {
      q: "Why do 4–5 slide slideshows underperform?",
      a: "A 4–5 slide deck is usually a 2–3 slide idea padded out, or an 8-slide list cut short — too long to be punchy, too short to be a satisfying list. In the data, this middle range was both the least common and the weakest performing.",
    },
    {
      q: "Do longer TikTok slideshows get more views?",
      a: "Not inherently. A 2-slide slideshow can do tens of millions of views if the first slide hooks. Length only helps when the format calls for it (a list where the value IS the list). Adding slides for the sake of length hurts more than it helps.",
    },
  ],
};

const CONTENT: Record<string, ReactNode> = {
  "how-many-slides-should-a-tiktok-slideshow-have": (
    <>
      <p className={P}>
        &ldquo;How many slides should a TikTok slideshow have?&rdquo; is one of the most common
        questions creators ask — so instead of guessing, I counted. I pulled{" "}
        <strong className="font-semibold text-foreground">125 viral TikTok slideshows</strong>{" "}
        across five niches and tallied the slide count of every single one. The answer surprised
        me: there isn&apos;t one ideal number. There are <em>two</em> — and a dead zone in between.
      </p>

      <h2 className={H2}>The short answer</h2>
      <p className={P}>
        The best-performing TikTok slideshows cluster at either{" "}
        <strong className="font-semibold text-foreground">2–3 slides</strong> (a quote, claim, or
        hot take) or <strong className="font-semibold text-foreground">6–8 slides</strong> (a list
        or story). Across the 125 viral slideshows I analyzed, 35% used 2–3 slides and 34% used
        6–8 — but only about 12% used 4–5. If you want the ideal TikTok slideshow length, commit to
        one of those two sweet spots and skip the mushy middle.
      </p>

      <h2 className={H2}>What I did: 125 viral slideshows, counted by hand</h2>
      <p className={P}>
        I collected 125 TikTok slideshows that had gone viral (hundreds of thousands to tens of
        millions of views) across motivation, gym/fitness, study, self-improvement, and book
        recommendations. For each one I recorded the exact number of slides. No theory, no
        vibes — just the distribution of what actually works.
      </p>

      <h2 className={H2}>The slide-count distribution</h2>
      <p className={P}>
        Here&apos;s how many photos the viral slideshows actually used:
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Slide count</th>
              <th className="px-4 py-3 font-semibold">Share of viral slideshows</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">2–3 slides</td>
              <td className="px-4 py-3">~35%</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">4–5 slides</td>
              <td className="px-4 py-3">~12% (the dead zone)</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">6–8 slides</td>
              <td className="px-4 py-3">~34%</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">9+ slides</td>
              <td className="px-4 py-3">~19% (mostly long book lists)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={P}>
        The median was <strong className="font-semibold text-foreground">6 slides</strong> and the
        average was 5.6 — but the average lies to you. Almost nobody who went viral actually posted
        exactly 5 slides. They committed to one of two shapes.
      </p>

      <h2 className={H2}>Camp 1: the 2–3 slide punch</h2>
      <p className={P}>
        A quote, a claim, a reminder, a hot take. One hook, one payoff, done. This is the
        motivation and gym lane — those two niches averaged around 4 and 3.6 slides. A 2-slide
        TikTok slideshow can absolutely do tens of millions of views if the first slide is right;
        length is not what carries it. If your idea is a single sharp statement, don&apos;t stretch
        it — 2–3 slides is the ideal length.
      </p>

      <h2 className={H2}>Camp 2: the 6–8 slide list</h2>
      <p className={P}>
        A hook that promises a count or a payoff, then one clean idea per slide. This is the
        BookTok, study, and self-improvement lane — book recommendations averaged 7.4 slides,
        self-improvement 7.3, and study 5.8. List-heavy niches naturally run longer because the
        value <em>is</em> the list. If you&apos;re making a &ldquo;5 things&rdquo; or a
        step-by-step, 6–8 slides is your target.
      </p>

      <h2 className={H2}>Why 4–5 slides underperforms</h2>
      <p className={P}>
        A 4–5 slide deck is usually one of two things: a 2–3 slide idea padded out, or an 8-slide
        list cut short. Either way it feels half-baked — too long to be punchy, too short to be a
        satisfying list. In the data this middle range was both the least common and the weakest.
        The viral slideshows almost never sat in that limbo.
      </p>

      <h2 className={H2}>How many slides by niche</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Niche</th>
              <th className="px-4 py-3 font-semibold">Average slide count</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Gym / fitness</td>
              <td className="px-4 py-3">~3.6</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Motivation</td>
              <td className="px-4 py-3">~4.0</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Study</td>
              <td className="px-4 py-3">~5.8</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Self-improvement</td>
              <td className="px-4 py-3">~7.3</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Book recommendations</td>
              <td className="px-4 py-3">~7.4</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className={H2}>How to choose your slide count</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li className={LI}>
          <strong className="font-semibold text-foreground">Quote, reminder, or hot take →</strong>{" "}
          2–3 slides. Hook plus payoff. Don&apos;t stretch it.
        </li>
        <li className={LI}>
          <strong className="font-semibold text-foreground">List, tips, or story →</strong> 6–8
          slides. A hook that teases the count, then one idea per slide.
        </li>
        <li className={LI}>
          <strong className="font-semibold text-foreground">Never aim for 4–5.</strong> If you land
          there, either cut to 3 or build out to 6+.
        </li>
        <li className={LI}>
          <strong className="font-semibold text-foreground">Decide before you start.</strong> The
          slideshows stuck at low views were the ones that couldn&apos;t decide which shape they
          were.
        </li>
      </ul>

      <h2 className={H2}>Frequently asked questions</h2>
      {FAQS["how-many-slides-should-a-tiktok-slideshow-have"]?.map((faq) => (
        <div key={faq.q}>
          <h3 className={H3}>{faq.q}</h3>
          <p className={P}>{faq.a}</p>
        </div>
      ))}

      <div className="mt-14 rounded-2xl bg-void p-6 text-center sm:p-8">
        <h2 className="font-display text-xl font-bold text-bone sm:text-2xl">
          Get the slide count right automatically
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-bone/70">
          viraltiktokslideshows writes your hook and picks the right number of slides for your
          format — punchy 2–3 or a full 6–8 list — from the same patterns behind these viral posts.
          Preview it free, unlock for $2.
        </p>
        <Button
          size="lg"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/generate" />}
        >
          Generate a slideshow
        </Button>
      </div>
    </>
  ),
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const body = CONTENT[slug];
  if (!post || !body) notFound();

  const url = `${BASE_URL}/blog/${post.slug}`;
  const faqs = FAQS[slug] ?? [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: { "@type": "Organization", name: "viraltiktokslideshows" },
    publisher: {
      "@type": "Organization",
      name: "viraltiktokslideshows",
      url: BASE_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.keywords.join(", "),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/blog" className="hover:text-foreground hover:underline">
          Blog
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground/70">{post.tag}</span>
      </nav>

      <article className="mt-4">
        <header>
          <p className="text-[11px] font-semibold tracking-widest text-riot uppercase">
            {post.tag}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-balance text-foreground sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={post.datePublished}>
              {new Date(post.datePublished).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingTimeMinutes} min read</span>
          </p>
        </header>

        <div className="mt-8">{body}</div>
      </article>

      <div className="mt-14 border-t border-border pt-8">
        <Link href="/blog" className="text-sm text-riot hover:underline">
          ← Back to all posts
        </Link>
      </div>
    </main>
  );
}
