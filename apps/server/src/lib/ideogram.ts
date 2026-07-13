import { env } from "@viraltiktokslideshows/env/server";

// Ideogram v4 generate endpoint — background images for slide cards. The
// app overlays its own text on top (see SlideshowPhonePreview and the
// tilted card treatments), so prompts explicitly ask for no embedded text.
//
// Auth is a plain `Api-Key` header (not `Authorization: Bearer`), and the
// request body is multipart/form-data, not JSON — both per Ideogram's own
// docs, not the OpenAI-style convention used elsewhere in this app.
//
// Important: returned image URLs are ephemeral — Ideogram's own docs say
// "if you would like to keep the image, you must download it." We don't
// have persistent object storage wired up yet, so these URLs are stored
// as-is on the Purchase row. They're generated close to when they'll
// actually be viewed/downloaded (checkout time, not the free-preview
// step), but a slideshow viewed much later from the dashboard may have
// expired image links — see docs/dashboard-spec.md follow-ups.

const IDEOGRAM_URL = "https://api.ideogram.ai/v1/ideogram-v4/generate";

function buildImagePrompt(slideText: string): string {
  return `A vertical, mobile-first background photo for a TikTok slideshow slide. Slide topic: "${slideText}". Minimal and cinematic, realistic photography style, no embedded text, no captions, no watermarks, no logos — the image is a backdrop only, text gets overlaid separately.`;
}

export async function generateSlideImage(slideText: string): Promise<string> {
  const form = new FormData();
  form.append("text_prompt", buildImagePrompt(slideText));
  form.append("rendering_speed", "TURBO");

  const res = await fetch(IDEOGRAM_URL, {
    method: "POST",
    headers: { "Api-Key": env.IDEOGRAM_API_KEY },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ideogram request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const url: string | undefined = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");

  return url;
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
