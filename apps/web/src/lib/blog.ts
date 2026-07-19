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
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...posts].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}
