import { generateSlideImages } from "./ideogram";
import { generateSlideshowText, type SlideFormat } from "./openrouter";
import { generateStockSlideImages } from "./stock-photos";

export type GeneratedSlide = { index: number; text: string; imageUrl?: string };

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
// Stays on Ideogram, not Pexels: this only ever runs after a Purchase row
// exists, which per index.ts's /api/checkout/create means either a $2
// unlock or a covered generation on an active paid plan — never an
// unconverted free preview. ~$0.18 of Ideogram spend (6 images) against
// $2 of revenue, or against a plan subscription already being paid for,
// is a real margin; spending the same on someone who hasn't committed to
// anything (the free-preview path above) isn't.
export async function fillRemainingSlideImages(
  slides: GeneratedSlide[],
): Promise<GeneratedSlide[]> {
  const missing = slides.filter((slide) => !slide.imageUrl);
  if (missing.length === 0) return slides;

  const images = await generateSlideImages(missing, "fillRemainingSlideImages:bulk");
  return slides.map((slide) =>
    images.has(slide.index) ? { ...slide, imageUrl: images.get(slide.index) } : slide,
  );
}
