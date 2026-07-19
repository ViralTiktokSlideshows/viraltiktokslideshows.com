import { getConceptVocabulary, pickImageUrl, pickLibraryImages } from "./library";
import {
  generateSlideshowText,
  type SlideFormat,
  type SlideTextPosition,
  type SlideTextStyle,
} from "./openrouter";

// The slide shape that flows through the whole app and gets stored on the
// Purchase row: the overlay text, its per-slide placement, the chosen library
// image concept, and (once resolved) the R2 image URL.
//   - `visual` and `textPosition` come from OpenRouter (see openrouter.ts):
//     `visual` is the library concept the model picked (drives which real R2
//     image is used), `textPosition` drives where the client draws the text.
//     Both are optional so a degraded model response still produces renderable
//     slides.
//   - `visual` is server-only in practice (the client never needs it), but it
//     rides along on the slide object through checkout so
//     fillRemainingSlideImages still has it when it resolves the paid slides'
//     images from the library.
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

// Called from /api/generate — real slide text for the whole deck, but only the
// hook slide gets a resolved image (the free preview only ever shows the hook).
// All images now come from our own R2 library (see library.ts): no Ideogram, no
// Pexels, so a preview costs nothing but the text call. The live library
// inventory is fed to the model so it only picks concepts that actually exist.
export async function generateSlideshow(
  idea: string,
  format: SlideFormat = "STORYTIME",
): Promise<GeneratedSlideshow> {
  const vocabulary = await getConceptVocabulary().catch(() => "");
  const { hook, slides } = await generateSlideshowText(idea, format, vocabulary);

  // generateSlideshowText guarantees at least 2 slides, but noUncheckedIndexedAccess
  // doesn't know that — guard explicitly rather than asserting.
  const hookSlide = slides[0];
  if (!hookSlide) {
    return { hook, slideCount: slides.length, slides };
  }

  // Resolve the hook's chosen concept to a real R2 image. Returns null only if
  // the library is completely empty, in which case the slide just renders with
  // the frontend's striped placeholder rather than failing.
  const hookImageUrl = await pickImageUrl(hookSlide.visual).catch(() => null);

  const enrichedSlides: GeneratedSlide[] = slides.map((slide) =>
    slide.index === hookSlide.index
      ? { ...slide, imageUrl: hookImageUrl ?? undefined }
      : slide,
  );

  return { hook, slideCount: enrichedSlides.length, slides: enrichedSlides };
}

// Called from /api/checkout/create once someone actually clicks Unlock — fills
// in images for every slide that doesn't have one yet (everything but the hook,
// normally). Slides that already have an image are left untouched.
//
// Every slide's background is resolved from the R2 library by its `visual`
// concept, with library.ts handling the fallbacks (exact concept -> same niche
// -> any library image). There is no longer any per-plan or per-payment
// difference in image source, and no external image API is called at all.
export async function fillRemainingSlideImages(
  slides: GeneratedSlide[],
): Promise<GeneratedSlide[]> {
  const missing = slides.filter((slide) => !slide.imageUrl);
  if (missing.length === 0) return slides;

  const images = await pickLibraryImages(missing);

  return slides.map((slide) =>
    images.has(slide.index) ? { ...slide, imageUrl: images.get(slide.index) } : slide,
  );
}
