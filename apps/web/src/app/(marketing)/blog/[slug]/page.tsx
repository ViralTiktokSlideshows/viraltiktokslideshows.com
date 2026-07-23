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
  "best-hashtags-for-tiktok-slideshows": [
    {
      q: "What are the best hashtags for TikTok slideshows?",
      a: "The best-performing formula is 3 to 5 hashtags: one niche community tag ending in \"-tok\" (like #gymtok or #booktok), one specific topic tag, and #fyp. Across 125 viral slideshows, the exact combo #motivation #selfimprovement #fyp appeared under multiple posts with 20–40 million views.",
    },
    {
      q: "How many hashtags should you use on TikTok?",
      a: "3 to 5. Posts over 1 million views almost never used more than 5 hashtags. Stacking 20–30 hyper-niche tags was a pattern seen almost exclusively on low-performing posts, not viral ones.",
    },
    {
      q: "Do 'tok' hashtags like #booktok or #gymtok actually help?",
      a: "Yes — the community \"-tok\" tag was the single most consistent tag across viral posts in every niche checked (GymTok, BookTok, StudyTok). It places your post into an active, engaged community feed instead of a generic, oversaturated pool.",
    },
    {
      q: "Should you still use #fyp on TikTok?",
      a: "Its presence alone won't make a post go viral, but its absence was noticeably more common on underperforming posts than on hits. It costs nothing to include, so viral posts almost always had it.",
    },
  ],
  "tiktok-slideshow-first-slide-hook": [
    {
      q: "Why does the first slide matter so much on TikTok slideshows?",
      a: "Slide 1 is the cover shown in the feed and gets the first one to two seconds of attention. If it doesn't hook, viewers swipe away, retention craters, and TikTok's algorithm stops showing the post to new people — slides 2 onward never even get seen by most of the audience.",
    },
    {
      q: "What makes a good TikTok slideshow hook?",
      a: "A curiosity gap or a command, never a description or a label. Winning hooks in the data were short (7 words or fewer), written in second person, and made the viewer need to see slide 2 — rather than telling them what the post was about upfront.",
    },
    {
      q: "What's an example of a bad TikTok slideshow first slide?",
      a: "Labels that describe the content instead of hooking it — things like \"active studying methods\" or \"some books I've read.\" These read like a table of contents. In the data, a study post with a label-style first slide got 56K views, while a nearly identical post on the same topic with a hook-style first slide got 11 million.",
    },
  ],
  "why-tiktok-videos-stuck-at-200-views": [
    {
      q: "Why is my TikTok stuck at 200 views?",
      a: "The 200-view wall almost always means TikTok showed your video to a small initial test batch and the engagement signals were too weak to push it further — it's rarely an actual shadowban. The most common cause is viewers swiping away in the first 1-2 seconds.",
    },
    {
      q: "Is the TikTok 200 views thing a shadowban?",
      a: "Usually not. In the large majority of cases it's a signals problem: weak retention in the first couple seconds, and not enough saves, shares, or comments to tell the algorithm to expand distribution — not an account-level penalty.",
    },
    {
      q: "How do you fix a TikTok stuck at low views?",
      a: "Put your hook in the first 1-2 seconds as on-screen text so it lands even on mute, build content people actually save (not just watch), post more often since reach is partly a numbers game, and upload clean — no watermark, fresh audio, and hashtags that aren't dead or banned.",
    },
    {
      q: "Do TikTok photo slideshows get more views than videos?",
      a: "Slideshows can outperform video for creators who struggle to break 200 views because they hit the same signals more reliably: the hook is on-screen text that works on mute, high save rates are common (one slideshow example did 39M views and 1.1M saves), and they're far cheaper to produce, so you can post more often.",
    },
  ],
};

// Every post links to the others via slug — a small, flat cluster. Shown at
// the bottom of each article so crawlers (and readers) hop between related
// pages instead of dead-ending, which is most of what "topical clustering"
// means in practice for a blog this size.
function RelatedPosts({ exclude }: { exclude: string }) {
  const others = getAllPosts().filter((post) => post.slug !== exclude);
  if (others.length === 0) return null;
  return (
    <div className="mt-14 border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-foreground">Related reading</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {others.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm font-medium text-riot hover:underline"
            >
              {post.title} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  "best-hashtags-for-tiktok-slideshows": (
    <>
      <p className={P}>
        I pulled the hashtags on every TikTok slideshow I&apos;d collected that broke a million
        views — 125 posts total — expecting chaos. Thirty tags, no pattern, everyone doing their
        own thing. Instead it was almost always the same three-part structure.
      </p>

      <h2 className={H2}>The short answer</h2>
      <p className={P}>
        The best hashtags for a TikTok slideshow are{" "}
        <strong className="font-semibold text-foreground">3 to 5 tags</strong> in this shape: one
        community &ldquo;-tok&rdquo; tag for your niche (like #gymtok or #booktok), one specific
        topic tag, and #fyp. That&apos;s it. Posts stacking 20–30 tags were almost never the
        million-view ones.
      </p>

      <h2 className={H2}>It was never 30 tags</h2>
      <p className={P}>
        The 1M+ posts almost all ran 3 to 5 hashtags, and the shape was consistent: one community
        &ldquo;-tok&rdquo; tag, one topic tag, plus #fyp. The decks stacking 20–30 tags were mostly
        the small ones, not the hits.
      </p>

      <h2 className={H2}>One literal trio kept repeating</h2>
      <p className={P}>
        The single most-copied combo I saw was{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
          #motivation #selfimprovement #fyp
        </code>
        . The exact same three tags sat under multiple posts in the 20–40M view range (one at
        41.8M, one at 33.1M, one at 28.5M). Not a coincidence — it&apos;s a formula those accounts
        run every time.
      </p>

      <h2 className={H2}>Every niche had its own version of the same shape</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Niche</th>
              <th className="px-4 py-3 font-semibold">Hashtag combo</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Gym</td>
              <td className="px-4 py-3">#gymtok #gym #fyp</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">BookTok</td>
              <td className="px-4 py-3">#booktok #bookrecs #fyp</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Study</td>
              <td className="px-4 py-3">#studytok #studytips #fyp</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium">Motivation / self-improvement</td>
              <td className="px-4 py-3">#motivation #selfimprovement #fyp</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className={H2}>The &ldquo;-tok&rdquo; community tag mattered most</h2>
      <p className={P}>
        BookTok, GymTok, StudyTok — that tag drops your post into a real, active community feed
        full of people who actually engage with that content, instead of a dead generic pool. It
        was the single most consistent tag across the winners in every niche I checked.
      </p>

      <h2 className={H2}>#fyp was almost universal</h2>
      <p className={P}>
        It&apos;s not magic on its own, but its <em>absence</em> was way more common on the flops
        than the hits. Same with #viral as an optional fourth tag on some posts.
      </p>

      <h2 className={H2}>What the small posts did wrong</h2>
      <p className={P}>
        Two failure modes showed up. Either they stacked 10–30 hyper-niche tags (#gymrat #gymbro
        #cutting #bulking...), which traps the post in a tiny pool that&apos;s already seen
        everything — or they went all-generic, which is infinite competition. The winners bridged
        both: one community tag, one topic tag, one reach tag.
      </p>

      <h2 className={H2}>What to copy</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li className={LI}>3–5 hashtags, not 30.</li>
        <li className={LI}>One &ldquo;-tok&rdquo; community tag for your niche.</li>
        <li className={LI}>One specific topic tag.</li>
        <li className={LI}>#fyp (and optionally #viral).</li>
      </ul>
      <p className={P}>
        It&apos;s almost boring how consistent it was. The biggest slideshows weren&apos;t doing
        anything clever with hashtags — they were running the same three-part combo over and over.
        Steal the structure, swap in your niche.
      </p>

      <h2 className={H2}>Frequently asked questions</h2>
      {FAQS["best-hashtags-for-tiktok-slideshows"]?.map((faq) => (
        <div key={faq.q}>
          <h3 className={H3}>{faq.q}</h3>
          <p className={P}>{faq.a}</p>
        </div>
      ))}

      <div className="mt-14 rounded-2xl bg-void p-6 text-center sm:p-8">
        <h2 className="font-display text-xl font-bold text-bone sm:text-2xl">
          Skip the guesswork on hooks, slides, and structure
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-bone/70">
          viraltiktokslideshows builds the hook, slide count, and pacing from the same viral-post
          patterns as this hashtag data. Preview it free, unlock for $2.
        </p>
        <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/generate" />}>
          Generate a slideshow
        </Button>
      </div>
    </>
  ),
  "tiktok-slideshow-first-slide-hook": (
    <>
      <p className={P}>
        I went through roughly 100 viral TikTok slideshows expecting the difference-makers to be
        spread across the whole deck — the images, the pacing, the closing line. They weren&apos;t.
        Almost all of the gap between a 50K post and a 5M post came down to one slide.
      </p>

      <h2 className={H2}>The short answer</h2>
      <p className={P}>
        Slide 1 is the only slide most people ever see. It&apos;s the cover shown in the feed, and
        it gets the first one to two seconds of attention. If it doesn&apos;t hook, viewers swipe,
        retention craters, and TikTok stops showing the post to new people — slides 2 through 8
        never even get loaded for most of the audience.
      </p>

      <h2 className={H2}>The winners&apos; first slide was a curiosity gap or a command</h2>
      <p className={P}>
        Real examples from the data: &ldquo;Damn…&rdquo; (11.8M views). &ldquo;thank me
        later&rdquo; (39M). &ldquo;The only academic comeback checklist you&apos;ll ever
        need&rdquo; (11M). &ldquo;put that phone down and start doing something.&rdquo; Short,
        second person, and they make you <em>need</em> slide 2. None of them told you what the
        post was — they made you curious or told you to do something.
      </p>

      <h2 className={H2}>The flops&apos; first slide was a label</h2>
      <p className={P}>
        It described the post instead of hooking it: &ldquo;active studying methods,&rdquo;
        &ldquo;BIBLE MOTIVATION VERSES,&rdquo; &ldquo;some books I&apos;ve read.&rdquo; Accurate,
        tidy, and dead on arrival. A study post whose first slide read like a promise did 11M. One
        whose first slide read like a table of contents, on the exact same topic, did 56K. The gap
        was the first slide.
      </p>

      <h2 className={H2}>What mattered less than expected</h2>
      <p className={P}>
        How polished slides 2 through 8 were. The exact images used. The caption. Those things help
        retention <em>once someone is already swiping</em> — but none of them fire if slide 1
        doesn&apos;t earn the swipe. People obsess over the body of a slideshow and neglect the one
        slide that decides everything.
      </p>

      <h2 className={H2}>How to fix your first slide</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li className={LI}>Make it a curiosity gap or a command — never a description or a label.</li>
        <li className={LI}>7 words or fewer. Second person, talking to one person.</li>
        <li className={LI}>
          If it tells the reader what the post is, rewrite it so they <em>need</em> to see the next
          slide.
        </li>
        <li className={LI}>
          Test it muted, with zero context: would a stranger scrolling actually stop?
        </li>
      </ul>
      <p className={P}>
        You can spend an hour perfecting the rest of a slideshow, but if slide 1 is a label, none
        of it gets seen. Put your effort where the algorithm actually looks first — the opening
        frame.
      </p>

      <h2 className={H2}>Frequently asked questions</h2>
      {FAQS["tiktok-slideshow-first-slide-hook"]?.map((faq) => (
        <div key={faq.q}>
          <h3 className={H3}>{faq.q}</h3>
          <p className={P}>{faq.a}</p>
        </div>
      ))}

      <div className="mt-14 rounded-2xl bg-void p-6 text-center sm:p-8">
        <h2 className="font-display text-xl font-bold text-bone sm:text-2xl">
          Write a hook that actually stops the scroll
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-bone/70">
          viraltiktokslideshows is built on hook rules like these — short, second-person, curiosity
          or command, never a label. Preview it free, unlock for $2.
        </p>
        <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/generate" />}>
          Generate a slideshow
        </Button>
      </div>
    </>
  ),
  "why-tiktok-videos-stuck-at-200-views": (
    <>
      <p className={P}>
        Used to think content quality mattered most. Turns out it&apos;s mostly the first two
        seconds.
      </p>
      <p className={P}>
        The &ldquo;200 view wall&rdquo; is real and it makes you feel shadowbanned, but 9 times out
        of 10 it&apos;s not a ban and it&apos;s not your follower count. It&apos;s a signals
        problem. TikTok shows every post to a small test batch first — a few hundred people — and
        decides whether to push it based on how that batch reacts. If the signals are weak, you
        stall at ~200. Here&apos;s what&apos;s actually killing it.
      </p>

      <h2 className={H2}>1. Your first 1–2 seconds don&apos;t hook</h2>
      <p className={P}>
        This is the biggest one. If people swipe in the first second, your retention craters and
        TikTok reads that as &ldquo;nobody wants this&rdquo; and stops showing it. Most stuck
        videos start with a slow intro, a &ldquo;hey guys,&rdquo; or context nobody asked for. The
        test batch is gone before you get to the good part.
      </p>

      <h2 className={H2}>2. Nobody&apos;s saving, sharing, or commenting</h2>
      <p className={P}>
        Views alone don&apos;t move you. Saves, shares, and comments do — they&apos;re the signals
        that tell the algorithm &ldquo;push this wider.&rdquo; A video can be fine to watch and
        still get zero saves, and fine-but-forgettable is exactly what plateaus at 200. If your
        content doesn&apos;t make someone save it or tag a friend, you&apos;ve capped yourself.
      </p>

      <h2 className={H2}>3. You&apos;re not posting enough</h2>
      <p className={P}>
        Reach is partly a lottery. Posting twice a week is two tickets. The accounts that break out
        are usually taking way more swings — I found the same creator with a 34K post and a 3M
        post, same niche, same hashtags. They didn&apos;t crack a code, they just posted enough to
        catch a wave.
      </p>

      <h2 className={H2}>4. Small technical stuff is throttling you</h2>
      <p className={P}>
        Reused or dead sounds, a watermark from CapCut or another app, banned or dead hashtags,
        editing entirely in-app. None of these are a &ldquo;ban,&rdquo; but they quietly suppress
        reach. Upload clean, use fresh audio, and check your hashtags aren&apos;t dead.
      </p>

      <h2 className={H2}>5. You picked the hardest possible format</h2>
      <p className={P}>
        Video has to earn watch time second by second, against creators with better cameras,
        editing, and lighting. You&apos;re competing on production you may not have.
      </p>

      <h2 className={H2}>What to actually change</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li className={LI}>
          Put a hook in the first 1–2 seconds — as on-screen text, so it lands even on mute. No
          intros.
        </li>
        <li className={LI}>
          Build for the save, not the view. A tip, a list, something worth keeping. Saves break
          plateaus faster than anything.
        </li>
        <li className={LI}>Post more. Treat each one as a ticket, not a masterpiece.</li>
        <li className={LI}>Upload clean: no watermark, fresh sound, live hashtags.</li>
        <li className={LI}>
          If video keeps dying, try photo slideshows. They quietly hit every signal the algorithm
          rewards — the big ones had insane save counts (one routine post did 39M views and 1.1M
          saves), they rack up dwell time because people swipe back and re-read, and they work on
          mute because the hook is just text on slide 1. They&apos;re also far cheaper to make, so
          you can post the volume that actually breaks you out.
        </li>
      </ul>
      <p className={P}>
        200 views usually isn&apos;t a ban and it isn&apos;t your followers. It&apos;s a signals
        problem — weak hook, nothing worth saving, not enough shots. Fix those, or switch to a
        format that racks up those signals for basically free.
      </p>

      <h2 className={H2}>Frequently asked questions</h2>
      {FAQS["why-tiktok-videos-stuck-at-200-views"]?.map((faq) => (
        <div key={faq.q}>
          <h3 className={H3}>{faq.q}</h3>
          <p className={P}>{faq.a}</p>
        </div>
      ))}

      <div className="mt-14 rounded-2xl bg-void p-6 text-center sm:p-8">
        <h2 className="font-display text-xl font-bold text-bone sm:text-2xl">
          Try the format that hits every signal
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-bone/70">
          viraltiktokslideshows turns any idea into a save-worthy slideshow with a hook built for
          the first two seconds. Preview it free, unlock for $2.
        </p>
        <Button size="lg" className="mt-6" nativeButton={false} render={<Link href="/generate" />}>
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

      <RelatedPosts exclude={slug} />

      <div className="mt-8 border-t border-border pt-8">
        <Link href="/blog" className="text-sm text-riot hover:underline">
          ← Back to all posts
        </Link>
      </div>
    </main>
  );
}
