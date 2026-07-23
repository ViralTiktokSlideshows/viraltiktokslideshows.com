// Blog post registry. Single source of truth for post metadata — drives the
// /blog index list, the per-post <title>/description/canonical/OpenGraph in
// /blog/[slug], the JSON-LD, and the sitemap. The article BODIES live as React
// components in the [slug] route's content map (keyed by slug); everything a
// crawler reads in <head> comes from here.

export type BlogPost = {
  slug: string;
  // H1 + OpenGraph title (human, punchy).
  title: string;
  // <title> tag — can be longer and more keyword-loaded than the H1.
  seoTitle: string;
  // Meta description (~150–160 chars, keyword-forward, click-worthy).
  description: string;
  // One-line summary shown on the /blog index card.
  excerpt: string;
  datePublished: string; // ISO date
  dateModified: string; // ISO date
  readingTimeMinutes: number;
  tag: string;
  keywords: string[];
};

export const posts: BlogPost[] = [
  {
    slug: "how-many-slides-should-a-tiktok-slideshow-have",
    title: "How Many Slides Should a TikTok Slideshow Have?",
    seoTitle:
      "How Many Slides Should a TikTok Slideshow Have? (125 Viral Ones Analyzed)",
    description:
      "I analyzed 125 viral TikTok slideshows to find the ideal slide count. The data shows two sweet spots — 2–3 or 6–8 slides — and a dead zone at 4–5. Full breakdown by niche inside.",
    excerpt:
      "I counted the slides in 125 viral TikTok slideshows. There isn't one magic number — there are two, and a dead zone in the middle. Here's the data.",
    datePublished: "2026-07-19",
    dateModified: "2026-07-19",
    readingTimeMinutes: 5,
    tag: "Playbook",
    keywords: [
      "how many slides should a tiktok slideshow have",
      "ideal tiktok slideshow length",
      "how many photos in a tiktok slideshow",
      "tiktok slideshow tips",
      "viral tiktok slideshow",
      "tiktok photo carousel length",
      "best number of slides tiktok",
    ],
  },
  {
    slug: "best-hashtags-for-tiktok-slideshows",
    title: "The Best Hashtags for TikTok Slideshows",
    seoTitle: "Best Hashtags for TikTok Slideshows (What 125 Viral Posts Used)",
    description:
      "I checked the hashtags under 125 viral TikTok slideshows. The million-view posts all used the same 3-part formula, not 30 random tags. Here's the exact combo, by niche.",
    excerpt:
      "The biggest TikTok slideshows weren't doing anything clever with hashtags — they ran the same 3-part combo over and over. Here's the exact formula.",
    datePublished: "2026-07-20",
    dateModified: "2026-07-20",
    readingTimeMinutes: 4,
    tag: "Playbook",
    keywords: [
      "best hashtags for tiktok slideshows",
      "tiktok slideshow hashtags",
      "how many hashtags on tiktok",
      "tiktok hashtags for views",
      "viral tiktok hashtags",
      "gymtok hashtags",
      "booktok hashtags",
    ],
  },
  {
    slug: "tiktok-slideshow-first-slide-hook",
    title: "Why Your First Slide Is the Only One That Matters",
    seoTitle: "TikTok Slideshow Hook: Why Your First Slide Decides Everything",
    description:
      "A 100-post breakdown of viral TikTok slideshows found almost the entire gap between 50K views and 5M views came down to slide 1. Here's what winning hooks do differently.",
    excerpt:
      "I went through 100 viral slideshows expecting the difference to be spread across the whole deck. It wasn't — it was almost entirely slide 1.",
    datePublished: "2026-07-21",
    dateModified: "2026-07-21",
    readingTimeMinutes: 4,
    tag: "Playbook",
    keywords: [
      "tiktok slideshow hook",
      "tiktok slideshow first slide",
      "tiktok slideshow cover",
      "how to hook viewers on tiktok",
      "tiktok slideshow ideas",
      "viral tiktok hook examples",
    ],
  },
  {
    slug: "why-tiktok-videos-stuck-at-200-views",
    title: "Why Your TikTok Videos Are Stuck at 200 Views",
    seoTitle: "Why Your TikTok Videos Aren't Getting More Than 200 Views (Fix It)",
    description:
      "The 200-view wall on TikTok usually isn't a shadowban — it's a signals problem. Here are the 5 real reasons your videos stall, and what to fix first.",
    excerpt:
      "Used to think content quality mattered most. Turns out it's mostly the first two seconds — and 4 other signals TikTok checks before it shows you to more people.",
    datePublished: "2026-07-22",
    dateModified: "2026-07-22",
    readingTimeMinutes: 5,
    tag: "Growth",
    keywords: [
      "tiktok stuck at 200 views",
      "why is my tiktok not getting views",
      "tiktok shadowban",
      "tiktok algorithm 2026",
      "tiktok not getting views fix",
      "tiktok views plateau",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}
