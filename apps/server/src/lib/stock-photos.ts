import { env } from "@viraltiktokslideshows/env/server";

import { persistImageToR2 } from "./r2";

// Free stock-photo background images (Pexels) for the bulk of a
// slideshow's images — everything past the hook slide, which stays on
// Ideogram (see generate-slideshow.ts). This is what actually cuts the
// per-slideshow image bill: a keyword search against an existing photo
// library costs nothing per call, vs. a generated image on every slide.
//
// Pexels over Unsplash: Unsplash's free "Demo" app tier caps out at 50
// requests/hour (production access requires an app review), which a
// single completed purchase (up to ~7 images) burns through fast under
// any real traffic. Pexels' free tier is 200 requests/hour / 20,000/month
// with no approval process, and its license permits commercial use with
// no required attribution (pexels.com/license). Swappable later if
// there's a reason to add Unsplash/Pixabay as an additional fallback —
// generateStockSlideImages is the only thing generate-slideshow.ts calls.

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const REQUEST_TIMEOUT_MS = 15_000;

// Small, hand-picked stopword list — only used for the *fallback* path
// where a slide somehow arrives without a model-provided `visual` concept
// and we have to scrape a query out of its overlay text. The normal path
// searches the `visual` (e.g. "stacks of cash on marble counter") directly,
// which is already a photographer's description and needs no cleanup.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "you", "your", "i", "my", "me", "we", "our", "they",
  "their", "he", "she", "his", "her", "not", "no", "so", "if", "then", "than",
  "as", "at", "by", "from", "into", "about", "up", "down", "out", "just",
  "how", "what", "why", "when", "who", "which", "one", "here", "there",
]);

// Turns a slide's overlay text into a rough image query. This is the
// FALLBACK only -- searching a slide's sentence ("Most viral advice is a
// lie") against a stock library returns nothing useful, which is the exact
// bug the `visual` concept from OpenRouter fixes. Kept solely so a slide
// with a missing/blank `visual` still attempts *some* search instead of
// hard-failing.
function queryFromSlideText(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const query = words.slice(0, 4).join(" ").trim();
  return query || "aesthetic lifestyle background";
}

// Trims a model-provided visual concept down to something Pexels searches
// well: it's already concrete, but occasionally verbose. Cap the word
// count and drop punctuation so "a lone climber on a mountain ridge, misty"
// becomes a clean "lone climber mountain ridge misty".
function normalizeVisualQuery(visual: string): string {
  const cleaned = visual
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ")
    .trim();
  return cleaned;
}

type PexelsPhoto = {
  src: { large2x?: string; large?: string; portrait?: string; original?: string };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

async function searchPexelsPhoto(query: string): Promise<string | null> {
  if (!env.PEXELS_API_KEY) return null;
  if (!query) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = new URL(PEXELS_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "1");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: env.PEXELS_API_KEY },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Pexels request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Pexels request failed (${res.status})`);
  }

  const data = (await res.json()) as PexelsSearchResponse;
  const photo = data.photos?.[0];
  return photo?.src.large2x ?? photo?.src.portrait ?? photo?.src.large ?? photo?.src.original ?? null;
}

type StockSlide = { index: number; text: string; visual?: string };

async function generateStockSlideImage(slide: StockSlide): Promise<string> {
  // Build an ordered list of queries to try, best first: the model's visual
  // concept, then progressively broader fallbacks. Each is only tried if
  // the previous returned nothing, so a good `visual` hit is a single call.
  const attempts: string[] = [];

  if (slide.visual) {
    const normalized = normalizeVisualQuery(slide.visual);
    if (normalized) {
      attempts.push(normalized);
      // A long, specific visual can miss; a broader first-few-words version
      // of the same concept usually still lands something on-theme.
      const broad = normalized.split(" ").slice(0, 3).join(" ");
      if (broad && broad !== normalized) attempts.push(broad);
    }
  }

  // Last resort: scrape keywords from the slide's own text. Weakest option
  // (this is the behavior that used to be the *only* behavior and returned
  // nothing for abstract slides), but better than no image at all.
  const textQuery = queryFromSlideText(slide.text);
  if (!attempts.includes(textQuery)) attempts.push(textQuery);

  let photoUrl: string | null = null;
  for (const query of attempts) {
    photoUrl = await searchPexelsPhoto(query);
    if (photoUrl) break;
  }

  if (!photoUrl) {
    throw new Error(
      `No Pexels result for slide ${slide.index} (tried: ${attempts.map((q) => `"${q}"`).join(", ")})`,
    );
  }

  // Re-uploaded to R2 rather than hotlinked, same as Ideogram images —
  // keeps a permanent copy under our own domain regardless of what
  // happens to the source photo or Pexels' own CDN later.
  const key = `slides/${crypto.randomUUID()}.jpg`;
  return persistImageToR2(photoUrl, key);
}

// Same shape/error-tolerance contract as ideogram.ts's generateSlideImages:
// one failed slide doesn't sink the batch — generate-slideshow.ts falls
// back to Ideogram for whatever's still missing after this runs.
export async function generateStockSlideImages(
  slides: StockSlide[],
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    slides.map(async (slide) => ({
      index: slide.index,
      url: await generateStockSlideImage(slide),
    })),
  );

  const images = new Map<number, string>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      images.set(result.value.index, result.value.url);
    } else {
      console.error("Stock slide image search failed", result.reason);
    }
  }
  return images;
}
