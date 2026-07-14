import { env } from "@viraltiktokslideshows/env/server";

import { persistImageToR2 } from "./r2";

// Ideogram v4 generate endpoint — background images for slide cards. The
// app overlays its own text on top (see SlideshowPhonePreview and the
// tilted card treatments), so prompts explicitly ask for no embedded text.
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

function buildImagePrompt(slideText: string): string {
  return `A vertical, mobile-first background photo for a TikTok slideshow slide. Slide topic: "${slideText}". Minimal and cinematic, realistic photography style, no embedded text, no captions, no watermarks, no logos — the image is a backdrop only, text gets overlaid separately.`;
}

export async function generateSlideImage(slideText: string): Promise<string> {
  const form = new FormData();
  form.append("text_prompt", buildImagePrompt(slideText));
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

  // Ephemeral Ideogram URL -> permanent R2 URL, immediately, before it can
  // expire. Key is unique per generation; no need to reuse/dedupe.
  const key = `slides/${crypto.randomUUID()}.png`;
  return persistImageToR2(image.url, key);
}

// Generates images for multiple slides in parallel. Any single failure
// doesn't sink the batch — that slide just falls back to no image (the
// frontend already has a striped placeholder treatment for this), since
// losing one background image out of seven isn't worth failing an entire
// paid unlock over.
export async function generateSlideImages(
  slides: { index: number; text: string }[],
): Promise<Map<number, string>> {
  const results = await Promise.allSettled(
    slides.map(async (slide) => ({
      index: slide.index,
      url: await generateSlideImage(slide.text),
    })),
  );

  const images = new Map<number, string>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      images.set(result.value.index, result.value.url);
    } else {
      console.error("Slide image generation failed", result.reason);
    }
  }
  return images;
}
