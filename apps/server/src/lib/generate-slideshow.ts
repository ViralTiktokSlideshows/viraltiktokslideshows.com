import { generateSlideImages } from "./ideogram";
import {
  generateSlideshowText,
  type SlideFormat,
  type SlideTextPosition,
  type SlideTextStyle,
} from "./openrouter";
import { generateStockSlideImages } from "./stock-photos";

// The slide shape that flows through the whole app and gets stored on the
// Purchase row: the overlay text, its per-slide placement, the described
// background photo concept, and (once generated) the R2 image URL.
//   - `visual` and `textPosition` come from OpenRouter (see openrouter.ts):
//     `visual` drives what photo is searched/generated, `textPosition`
//     drives where the client draws the text. Both are optional so a
//     degraded model response still produces renderable slides.
//   - `visual` is server-only in practice (the client never needs it), but
//     it rides along on the slide object through checkout so
//     fillRemainingSlideImages still has it when it generates the paid
//     slides' images.
export type GeneratedSlide = {
  index: number;
  text: string;
  visual?: string;
  textPosition?: SlideTextPosition;
  textStyle?: SlideTextStyle;
  imageUrl?: string;
};

export type GeneratedSlideshow = {
  hook: string;
  slideCount: number;
  slides: GeneratedSlide[];
};

// Called from /api/generate — real slide text for the whole deck, but only
// the hook slide gets a real image. Most people who try the free preview
// never pay, so this deliberately does NOT spend Ideogram credits here:
// the hook image comes from free Pexels stock search instead, with
// Ideogram only as a fallback if Pexels comes up empty for that slide (so
// a preview still ships with some image rather than none, at the cost of
// an occasional $0.03 on a non-converting visitor). The real Ideogram
// spend all happens post-unlock, in fillRemainingSlideImages below, where
// it's actually backed by revenue.
export async function generateSlideshow(
  idea: string,
  format: SlideFormat = "STORYTIME",
): Promise<GeneratedSlideshow> {
  const { hook, slides } = await generateSlideshowText(idea, format);

  // generateSlideshowText guarantees at least 3 slides, but noUncheckedIndexedAccess
  // doesn't know that — guard explicitly rather than asserting.
  const hookSlide = slides[0];
  if (!hookSlide) {
    return { hook, slideCount: slides.length, slides };
  }

  // Search Pexels using the slide's *visual* concept (e.g. "person alone
  // scrolling phone dark room"), not its overlay text -- searching the text
  // ("Most viral advice is a lie") matches no stock photo. Falls back to
  // Ideogram if Pexels has no hit for that concept.
  let hookImages = await generateStockSlideImages([hookSlide]);
  if (!hookImages.has(hookSlide.index)) {
    hookImages = await generateSlideImages([hookSlide], "generateSlideshow:hook-fallback");
  }
  const hookImageUrl = hookImages.get(hookSlide.index);

  const enrichedSlides: GeneratedSlide[] = slides.map((slide) =>
    slide.index === hookSlide.index ? { ...slide, imageUrl: hookImageUrl } : slide,
  );

  return { hook, slideCount: enrichedSlides.length, slides: enrichedSlides };
}

// Called from /api/checkout/create once someone actually clicks Unlock —
// fills in images for every slide that doesn't have one yet (everything
// but the hook, normally). Slides that already have an image are left
// untouched rather than re-generated.
//
// Image source is split by who's paying:
//   - Plan subscribers (options.plan === true): AI-generated Ideogram
//     images -- the premium look reserved for an active subscription. These
//     are re-encoded/downscaled to TikTok size before storage.
//   - $2 one-off unlock (options.plan === false): free Pexels stock photos,
//     so a single $2 sale never costs us Ideogram credits. Ideogram is used
//     only as a fallback for the odd slide Pexels can't fill, so the paid
//     slideshow still has an image on every slide.
//
// Each missing slide carries its own `visual` from OpenRouter, so both
// paths pick/generate a background built for that specific slide's concept
// (see stock-photos.ts's search + ideogram.ts's buildImagePrompt).
export async function fillRemainingSlideImages(
  slides: GeneratedSlide[],
  options: { plan: boolean },
): Promise<GeneratedSlide[]> {
  const missing = slides.filter((slide) => !slide.imageUrl);
  if (missing.length === 0) return slides;

  const images = new Map<number, string>();

  if (options.plan) {
    const ai = await generateSlideImages(missing, "fillRemainingSlideImages:plan-ai", true);
    for (const [index, url] of ai) images.set(index, url);
  } else {
    const stock = await generateStockSlideImages(missing);
    for (const [index, url] of stock) images.set(index, url);

    const stillMissing = missing.filter((slide) => !images.has(slide.index));
    if (stillMissing.length > 0) {
      const fallback = await generateSlideImages(
        stillMissing,
        "fillRemainingSlideImages:paid-fallback",
        true,
      );
      for (const [index, url] of fallback) images.set(index, url);
    }
  }

  return slides.map((slide) =>
    images.has(slide.index) ? { ...slide, imageUrl: images.get(slide.index) } : slide,
  );
}
