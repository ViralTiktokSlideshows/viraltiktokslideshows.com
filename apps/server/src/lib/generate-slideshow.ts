import { generateSlideImages } from "./ideogram";
import { generateSlideshowText, type SlideFormat } from "./openrouter";

export type GeneratedSlide = { index: number; text: string; imageUrl?: string };

export type GeneratedSlideshow = {
  hook: string;
  slideCount: number;
  slides: GeneratedSlide[];
};

// Called from /api/generate — real slide text for the whole deck, but
// only the hook slide gets a real image. This is the free-preview step
// and most people who try it never pay, so we don't spend Ideogram
// credits on slides 2-N until someone actually commits to unlocking (see
// fillRemainingSlideImages, called from /api/checkout/create).
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

  const hookImages = await generateSlideImages([hookSlide]);
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
export async function fillRemainingSlideImages(
  slides: GeneratedSlide[],
): Promise<GeneratedSlide[]> {
  const missing = slides.filter((slide) => !slide.imageUrl);
  if (missing.length === 0) return slides;

  const images = await generateSlideImages(missing);
  return slides.map((slide) =>
    images.has(slide.index) ? { ...slide, imageUrl: images.get(slide.index) } : slide,
  );
}
