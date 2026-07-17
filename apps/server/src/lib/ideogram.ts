import { env } from "@viraltiktokslideshows/env/server";

import type { SlideTextPosition } from "./openrouter";
import { persistImageToR2 } from "./r2";

// Ideogram v4 generate endpoint — background images for slide cards. The
// app overlays its own text on top (see SlideshowPhonePreview and the
// canvas compositor), so prompts explicitly ask for no embedded text.
//
// Auth is a plain `Api-Key` header (not `Authorization: Bearer`), and the
// request body is multipart/form-data, not JSON — both per Ideogram's own
// docs, not the OpenAI-style convention used elsewhere in this app.
//
// Ideogram's own docs say returned image URLs are ephemeral ("if you would
// like to keep the image, you must download it"), so every image is
// re-uploaded to R2 immediately after generation (see ./r2.ts) and it's
// the R2 URL — never the raw Ideogram one — that gets returned/persisted.

const IDEOGRAM_URL = "https://api.ideogram.ai/v1/ideogram-v4/generate";

// Ideogram v4 only offers a fixed set of 2K resolutions (no free-form
// aspect_ratio param like v3 had). 1440x2560 is the one exact 9:16 option
// in that list — matches the phone-mockup slide format natively instead
// of relying on object-cover cropping.
const RESOLUTION = "1440x2560";

// Generation can occasionally hang past what a user will wait out — cut it
// off rather than leaving "Building your slideshow…" spinning forever.
const REQUEST_TIMEOUT_MS = 45_000;

// Confirmed against Ideogram's own API pricing page (ideogram.ai/pricing,
// "API pricing" section, rev. Aug 6 2025): "4.0 Turbo" — the exact model +
// rendering_speed this file requests — is $0.03/image. v4 Turbo and v3
// Turbo are the same rate; the earlier guess here (v4 being pricier than
// v3) was wrong. Still a display estimate, not a value Ideogram's API
// actually returns anywhere in the response — re-check this constant if
// Ideogram revises pricing.
const ESTIMATED_COST_PER_IMAGE_USD = 0.03;

// Process-lifetime only — resets on every deploy/restart, so treat this as
// "spend since the server last started," not a running account balance.
// Good enough for spotting a burst of unexpected volume in the logs;
// Ideogram's own dashboard is still the source of truth for real balance.
let processImageCount = 0;
let processEstimatedCostUsd = 0;

type IdeogramImageObject = {
  url: string | null;
  is_image_safe: boolean;
  resolution: string;
  prompt: string;
  seed: number;
};

type IdeogramResponse = {
  created: string;
  data: IdeogramImageObject[];
};

type ImageSlide = {
  index: number;
  text: string;
  visual?: string;
  textPosition?: SlideTextPosition;
};

// Where the overlay text will be drawn, and therefore which region of the
// generated photo has to stay visually quiet so the text reads. The subject
// is deliberately pushed to the OPPOSITE end from the text: text at the top
// -> subject low in frame; text at the bottom -> subject high, open
// foreground; text centered -> subject offset toward an edge with the
// middle kept calm. Keeping this in lockstep with where the client actually
// draws the text (see slide-text-style.ts) is what makes the text land on
// empty space instead of across someone's face.
function compositionForPosition(position: SlideTextPosition | undefined): string {
  switch (position) {
    case "bottom":
      return "Compose the shot with the main subject high in the frame, filling roughly the upper two-thirds, leaving the lower third calm and uncluttered (open floor, a plain surface, soft foreground, or gentle shadow) so bold text can sit along the bottom without covering the subject.";
    case "center":
      return "Compose the shot with the main subject weighted toward the top or one side, leaving a calm, low-detail band across the middle of the frame (soft background, negative space, or gentle gradient) so bold text can sit centered without competing with the subject.";
    case "top":
    default:
      return "Compose the shot with the main subject low-and-centered, filling roughly the lower two-thirds, and keep the upper third visually quiet and uncluttered (a plain wall, open sky, or soft out-of-focus background) so bold text can sit up top without competing with the subject.";
  }
}

// The background photo for one slide. Built from the slide's own `visual`
// concept (the described scene, e.g. "stacks of cash on marble counter"),
// NOT its overlay text -- so the image is of an actual thing that suits the
// slide, and every slide in a deck gets its own distinct shot rather than a
// single look stamped across all of them. Composition is tuned per slide to
// leave that slide's text zone empty.
function buildImagePrompt(slide: ImageSlide): string {
  // If the model didn't supply a visual concept, fall back to a neutral,
  // on-brand descriptor rather than dumping the slide's sentence into the
  // image prompt (which would render as a literal, text-in-image mess).
  const scene = slide.visual?.trim() || "a clean, minimal, on-brand lifestyle scene";
  const composition = compositionForPosition(slide.textPosition);

  return `A vertical, mobile-first background photo for a TikTok slideshow slide. Subject of the photo: ${scene}. Realistic, cinematic photography — natural light, shallow depth of field, high quality. Absolutely no embedded text, captions, watermarks, logos, charts, or infographics; this image is a backdrop only, the text gets overlaid separately by the app. ${composition}`;
}

// `context` is a free-text label for where this call came from (e.g.
// "generateSlideshow:hook" vs "fillRemainingSlideImages:bulk") — purely
// for the cost logs below, so a spike in spend can be traced back to which
// code path is generating the volume without guessing.
export async function generateSlideImage(
  slide: ImageSlide,
  context = "unlabeled",
  reencode = false,
): Promise<string> {
  const start = Date.now();

  const form = new FormData();
  form.append("text_prompt", buildImagePrompt(slide));
  form.append("rendering_speed", "TURBO");
  form.append("resolution", RESOLUTION);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(IDEOGRAM_URL, {
      method: "POST",
      headers: { "Api-Key": env.IDEOGRAM_API_KEY },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Ideogram request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ideogram request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as IdeogramResponse;
  const image = data?.data?.[0];

  // Per Ideogram's own schema: if is_image_safe is false, the url field is
  // empty. Check the flag explicitly (rather than just checking for a
  // missing url) so a future API change that still returns a url alongside
  // is_image_safe: false doesn't slip an unsafe image through.
  if (!image || !image.is_image_safe || !image.url) {
    throw new Error("Ideogram returned no safe image");
  }

  // Ideogram bills as soon as this response comes back with a real image --
  // whatever happens next (our own R2 upload) doesn't change that. Log the
  // cost here, not after persistImageToR2, so a downstream R2 failure (slow
  // network, timeout, etc.) doesn't make a real charge invisible to these
  // logs. This was a real gap: a generation that succeeded here but then
  // failed to persist used to show up as $0 spent, when Ideogram's own
  // dashboard had already billed it.
  const genDurationMs = Date.now() - start;
  processImageCount += 1;
  processEstimatedCostUsd += ESTIMATED_COST_PER_IMAGE_USD;
  console.log(
    `[ideogram:cost] BILLED context=${context} resolution=${image.resolution} genDurationMs=${genDurationMs} ` +
      `estCost=$${ESTIMATED_COST_PER_IMAGE_USD.toFixed(3)} processTotalImages=${processImageCount} ` +
      `processEstTotal=$${processEstimatedCostUsd.toFixed(2)} slideText="${slide.text.slice(0, 60)}"`,
  );

  // Ephemeral Ideogram URL -> permanent R2 URL, immediately, before it can
  // expire. Key is unique per generation (extension is chosen by
  // persistImageToR2 based on whether it re-encodes). `reencode` shrinks the
  // large 2K PNG down to TikTok size + JPEG for paid images; the free
  // preview hook passes false so that fast path stays untouched.
  const key = `slides/${crypto.randomUUID()}`;
  let url: string;
  try {
    url = await persistImageToR2(image.url, key, { reencode });
  } catch (err) {
    // The Ideogram spend above already happened and can't be undone -- this
    // is a paid-for image getting thrown away because our own storage step
    // failed, not Ideogram's fault. Flagged distinctly from a generation
    // failure so it's obvious in the logs that this one cost money even
    // though the slide ends up with no image.
    console.error(
      `[ideogram:cost] PAID BUT LOST context=${context} — Ideogram generated and billed this image, ` +
        `but persisting it to R2 failed, so it won't be used`,
      err,
    );
    throw err;
  }

  console.log(
    `[ideogram:cost] persisted context=${context} totalDurationMs=${Date.now() - start}`,
  );

  return url;
}

// Generates images for multiple slides in parallel. Any single failure
// doesn't sink the batch — that slide just falls back to no image (the
// frontend already has a striped placeholder treatment for this), since
// losing one background image out of seven isn't worth failing an entire
// paid unlock over.
export async function generateSlideImages(
  slides: ImageSlide[],
  context = "unlabeled",
  reencode = false,
): Promise<Map<number, string>> {
  const batchStart = Date.now();
  const billedCostBefore = processEstimatedCostUsd;

  const results = await Promise.allSettled(
    slides.map(async (slide) => ({
      index: slide.index,
      url: await generateSlideImage(slide, context, reencode),
    })),
  );

  const images = new Map<number, string>();
  let failures = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      images.set(result.value.index, result.value.url);
    } else {
      failures += 1;
      console.error("Slide image generation failed", result.reason);
    }
  }

  // Two different numbers on purpose: `billedThisBatch` is real Ideogram
  // spend (tracked in generateSlideImage the moment Ideogram returns an
  // image, win or lose downstream) — `usable` is how many slides actually
  // got a working image out of it. A gap between them (billed > usable *
  // rate) means images were generated and paid for, then lost to an R2
  // failure — see the "PAID BUT LOST" log above for which ones.
  const billedThisBatch = processEstimatedCostUsd - billedCostBefore;
  console.log(
    `[ideogram:cost] batch complete context=${context} requested=${slides.length} ` +
      `usable=${images.size} failed=${failures} billedThisBatch=$${billedThisBatch.toFixed(3)} ` +
      `batchDurationMs=${Date.now() - batchStart}`,
  );

  return images;
}
