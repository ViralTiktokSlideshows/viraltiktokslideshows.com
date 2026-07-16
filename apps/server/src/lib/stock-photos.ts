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

// Small, hand-picked stopword list — good enough to pull the 2-4 words
// that actually describe the image out of a slide's sentence, without
// pulling in an NLP dependency for what's ultimately a best-effort search
// query.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "you", "your", "i", "my", "me", "we", "our", "they",
  "their", "he", "she", "his", "her", "not", "no", "so", "if", "then", "than",
  "as", "at", "by", "from", "into", "about", "up", "down", "out", "just",
  "how", "what", "why", "when", "who", "which", "one", "here", "there",
]);

function extractSearchQuery(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const query = words.slice(0, 4).join(" ").trim();
  // Slide text that's all stopwords/short words is rare but not
  // impossible, and a blank query would just 400 against Pexels — a
  // neutral, on-brand aesthetic beats no image at all.
  return query || "aesthetic lifestyle";
}

type PexelsPhoto = {
  src: { large2x?: string; large?: string; portrait?: string; original?: string };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

async function searchPexelsPhoto(query: string): Promise<string | null> {
  if (!env.PEXELS_API_KEY) return null;

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

async function generateStockSlideImage(slideText: string): Promise<string> {
  const query = extractSearchQuery(slideText);
  let photoUrl = await searchPexelsPhoto(query);

  // A narrow multi-word query can miss on unusual/very specific slide
  // text — retry once with just the first keyword before giving up,
  // rather than falling straight through to no image.
  if (!photoUrl) {
    const [firstWord] = query.split(" ");
    if (firstWord && firstWord !== query) {
      photoUrl = await searchPexelsPhoto(firstWord);
    }
  }

  if (!photoUrl) {
    throw new Error(`No Pexels result for "${query}"`);
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
  slides: { index: number; text: string }[],
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    slides.map(async (slide) => ({
      index: slide.index,
      url: await generateStockSlideImage(slide.text),
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
