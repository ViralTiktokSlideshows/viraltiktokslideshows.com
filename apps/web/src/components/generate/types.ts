import type { SlideTextPosition } from "./slide-text-style";

export interface GeneratedSlide {
  index: number;
  text: string;
  // Ideogram background image URL. Only the hook (slide 1) has one right
  // after /api/generate — the rest fill in once someone actually unlocks
  // (see apps/server/src/lib/generate-slideshow.ts). These URLs are
  // ephemeral, so a slide with no imageUrl (or an expired one) should
  // fall back to the striped placeholder treatment, not break the layout.
  imageUrl?: string;
  // Per-slide overlay-text placement, chosen by the model so each slide's
  // text lands where its background photo left room (see slide-text-style.ts).
  textPosition?: SlideTextPosition;
  // The described photo concept behind this slide (e.g. "stacks of cash on
  // marble counter"). Rides along from /api/generate so that when someone
  // unlocks, the server still has each slide's concept to generate its
  // remaining images from (see fillRemainingSlideImages). Never rendered.
  visual?: string;
}

export interface GeneratedSlideshow {
  id: string;
  idea: string;
  formats: string[];
  vibes: string[];
  hook: string;
  slideCount: number;
  slides: GeneratedSlide[];
}
